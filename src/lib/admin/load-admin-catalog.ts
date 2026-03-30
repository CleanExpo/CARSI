import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export type AdminLesson = {
  id: string;
  title: string;
};

export type AdminModule = {
  moduleNo: number;
  title: string;
  lessons: AdminLesson[];
};

export type AdminCatalogCourse = {
  slug: string;
  title: string;
  status: string;
  priceAud: number;
  isFree: boolean;
  iicrcDiscipline: string | null;
  moduleCount: number;
  categories: string[];
  modules: AdminModule[];
};

export type AdminCatalog = {
  courses: AdminCatalogCourse[];
  generatedAt: string;
  excelPath: string;
};

/** Repo workbook: override with CARSI_COURSES_XLSX_PATH for deploys that store it elsewhere. */
const DEFAULT_XLSX_PATH = path.join('data', 'carsi_courses.xlsx');
const XLSX_PATH = process.env.CARSI_COURSES_XLSX_PATH ?? DEFAULT_XLSX_PATH;

type CacheEntry = {
  mtimeMs: number;
  data: AdminCatalog;
};

let cache: CacheEntry | null = null;

function toJsonSafeString(s: string) {
  return s.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export async function loadAdminCatalogFromXlsx(): Promise<AdminCatalog> {
  const resolved = path.resolve(process.cwd(), XLSX_PATH);
  const excelPath = fs.existsSync(XLSX_PATH) ? XLSX_PATH : resolved;
  const stat = fs.statSync(excelPath);

  if (cache && cache.mtimeMs === stat.mtimeMs) return cache.data;

  const script = `
import sys, zipfile, json
import xml.etree.ElementTree as ET

XLSX_PATH = sys.argv[1]

W_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

ns = {'w': W_NS}

def cell_text(cell, shared):
    t = cell.attrib.get('t')
    if t == 'inlineStr':
        tnode = cell.find('.//w:t', ns)
        return (tnode.text if tnode is not None else None)
    v = cell.find('w:v', ns)
    if v is None or v.text is None:
        return None
    raw = v.text
    if t == 's':
        idx = int(raw)
        return shared[idx] if 0 <= idx < len(shared) else None
    return raw

def normalize_header(s: str):
    if s is None:
        return ''
    return s.strip().lower()

def parse_sheet(z, sheet_file):
    root = ET.fromstring(z.read('xl/worksheets/' + sheet_file))
    sheetData = root.find('w:sheetData', ns)
    rows = sheetData.findall('w:row', ns) if sheetData is not None else []
    if not rows:
        return []
    header_row = rows[0]
    header_map = {}  # col_letter -> header_text
    for c in header_row.findall('w:c', ns):
        ref = c.attrib.get('r')
        if not ref:
            continue
        col = ''.join([ch for ch in ref if ch.isalpha()])
        val = cell_text(c, shared)
        header_map[col] = val

    # normalize mapping header_text -> col_letter
    header_to_col = {}
    for col, h in header_map.items():
        header_to_col[normalize_header(h)] = col

    # data rows start at row 2
    records = []
    for row in rows[1:]:
        cells = row.findall('w:c', ns)
        if not cells:
            continue
        row_obj = {}
        for c in cells:
            ref = c.attrib.get('r')
            if not ref:
                continue
            col = ''.join([ch for ch in ref if ch.isalpha()])
            row_obj[col] = cell_text(c, shared)
        records.append(row_obj)

    return records, header_to_col

with zipfile.ZipFile(XLSX_PATH) as z:
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    sheets_el = wb.find('w:sheets', ns)
    sheet_defs = []
    if sheets_el is not None:
        for s in sheets_el.findall('w:sheet', ns):
            name = s.attrib.get('name')
            rel_id = s.attrib.get('{%s}id' % R_NS)
            sheet_defs.append((name, rel_id))

    # shared strings
    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        ss = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in ss.findall('w:si', ns):
            texts = []
            for t in si.findall('.//w:t', ns):
                texts.append(t.text if t is not None else '')
            shared.append(''.join(texts))

    rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    rel_map = {}
    for rel in rels.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
        rid = rel.attrib.get('Id')
        target = rel.attrib.get('Target')
        if rid and target:
            rel_map[rid] = target.split('/')[-1]

    # resolve sheet files by name
    courses_sheet = None
    modules_sheet = None
    for name, rid in sheet_defs:
        file = rel_map.get(rid)
        if not file:
            continue
        if name == 'Courses':
            courses_sheet = file
        elif name == 'Modules & Lessons':
            modules_sheet = file

    if not courses_sheet or not modules_sheet:
        raise SystemExit('Expected sheets not found: Courses / Modules & Lessons')

    # parse Courses sheet
    courses_records, courses_header_to_col = parse_sheet(z, courses_sheet)

    def get_col(header_to_col, *keys):
        for k in keys:
            lk = normalize_header(k)
            if lk in header_to_col:
                return header_to_col[lk]
        return None

    slug_col = get_col(courses_header_to_col, 'slug')
    title_col = get_col(courses_header_to_col, 'title')
    status_col = get_col(courses_header_to_col, 'status')
    price_col = get_col(courses_header_to_col, 'price (aud)', 'price aud')
    free_col = get_col(courses_header_to_col, 'free?')
    discipline_col = get_col(courses_header_to_col, 'iicrc discipline')
    module_count_col = get_col(courses_header_to_col, 'module count')
    categories_col = get_col(courses_header_to_col, 'categories')

    if not slug_col or not title_col:
        raise SystemExit('Missing required course columns')

    courses = []
    by_slug = {}
    for rec in courses_records:
        slug = rec.get(slug_col) or ''
        slug = slug.strip().lower()
        if not slug:
            continue
        title = (rec.get(title_col) or slug).strip()
        status = (rec.get(status_col) or 'draft').strip()

        price_raw = (rec.get(price_col) if price_col else None)
        try:
            priceAud = float(price_raw) if price_raw not in (None, '') else 0.0
        except:
            priceAud = 0.0

        free_raw = (rec.get(free_col) if free_col else None)
        free_str = (free_raw or '').strip().lower()
        isFree = free_str in ('true', 'yes', '1', 'y')

        discipline = (rec.get(discipline_col) if discipline_col else None)
        discipline = (discipline.strip() if isinstance(discipline,str) else discipline) if discipline is not None else None
        if discipline == '':
            discipline = None

        module_count_raw = rec.get(module_count_col) if module_count_col else None
        try:
            moduleCount = int(float(module_count_raw)) if module_count_raw not in (None,'') else 0
        except:
            moduleCount = 0

        cats_raw = rec.get(categories_col) if categories_col else None
        categories = []
        if isinstance(cats_raw, str) and cats_raw.strip():
            categories = [c.strip() for c in cats_raw.split(',') if c.strip()]

        by_slug[slug] = len(courses)
        courses.append({
            'slug': slug,
            'title': title,
            'status': status,
            'priceAud': priceAud,
            'isFree': isFree,
            'iicrcDiscipline': discipline,
            'moduleCount': moduleCount,
            'categories': categories,
            'modules': []
        })

    # parse Modules & Lessons sheet
    modules_records, modules_header_to_col = parse_sheet(z, modules_sheet)
    course_slug_col = get_col(modules_header_to_col, 'course slug')
    module_no_col = get_col(modules_header_to_col, 'module #', 'module no', 'module number')
    module_title_col = get_col(modules_header_to_col, 'module title')
    if not course_slug_col or not module_no_col or not module_title_col:
        raise SystemExit('Missing required module columns')

    for rec in modules_records:
        course_slug = (rec.get(course_slug_col) or '').strip().lower()
        if not course_slug:
            continue
        idx = by_slug.get(course_slug)
        if idx is None:
            # create course placeholder if modules exist but courses sheet is missing this slug
            by_slug[course_slug] = len(courses)
            courses.append({
                'slug': course_slug,
                'title': (rec.get(modules_header_to_col.get(normalize_header('course title'), ''), None) or course_slug),
                'status': 'draft',
                'priceAud': 0.0,
                'isFree': True,
                'iicrcDiscipline': None,
                'moduleCount': 0,
                'categories': [],
                'modules': []
            })
            idx = by_slug[course_slug]

        module_no_raw = rec.get(module_no_col)
        try:
            module_no = int(float(module_no_raw)) if module_no_raw not in (None,'') else 0
        except:
            module_no = 0
        module_title = (rec.get(module_title_col) or '').strip()
        if not module_title:
            module_title = f'Module {module_no}'

        # add module
        courses[idx]['modules'].append({
            'moduleNo': module_no,
            'title': module_title,
            'lessons': [{
                'id': f\"{course_slug}-module-{module_no}-lesson-1\",
                'title': module_title,
            }]
        })

    # sort modules and finalize moduleCount
    for c in courses:
        c['modules'].sort(key=lambda m: m.get('moduleNo', 0))
        if not c.get('moduleCount'):
            c['moduleCount'] = len(c['modules'])

    print(json.dumps({
        'courses': courses,
        'generatedAt': 'now'
    }))
`;

  const b64 = Buffer.from(script, 'utf8').toString('base64');
  const python = 'python3';
  const out = execFileSync(python, ['-c', `import base64; exec(base64.b64decode('${b64}'));` , excelPath], {
    encoding: 'utf8',
  });

  const parsed = JSON.parse(out) as { courses: Omit<AdminCatalogCourse, 'generatedAt' | 'excelPath'>[] };
  const data: AdminCatalog = {
    courses: parsed.courses as unknown as AdminCatalogCourse[],
    generatedAt: new Date().toISOString(),
    excelPath,
  };

  cache = { mtimeMs: stat.mtimeMs, data };
  return data;
}

