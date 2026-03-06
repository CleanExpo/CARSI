"""
Seed 5 IICRC courses into the CARSI LMS via the REST API.

Usage:
    python scripts/seed_iicrc_courses.py

Requires: backend running at http://localhost:8000
Uses: admin user ecb3011b-04b8-462f-9a5f-2f2bedcf761f (admin@carsi.com.au)
"""

import json
import sys
import urllib.request
import urllib.error

BASE_URL = "http://localhost:8000"
ADMIN_USER_ID = "ecb3011b-04b8-462f-9a5f-2f2bedcf761f"

HEADERS = {
    "Content-Type": "application/json",
    "X-User-Id": ADMIN_USER_ID,
}

# ---------------------------------------------------------------------------
# Course definitions
# ---------------------------------------------------------------------------

COURSES = [
    {
        "title": "Water Restoration Technician (WRT)",
        "slug": "wrt-water-restoration-technician",
        "description": (
            "IICRC-approved Water Restoration Technician course covering the "
            "principles and practices of water damage restoration. Learn moisture "
            "measurement, drying science, and structural drying techniques used "
            "in the Australian restoration industry."
        ),
        "short_description": "Master water damage restoration fundamentals with IICRC CECs.",
        "price_aud": "500.00",
        "is_free": False,
        "level": "beginner",
        "category": "Water Restoration",
        "iicrc_discipline": "WRT",
        "cec_hours": "8.0",
        "tags": ["iicrc", "wrt", "water-damage", "restoration"],
        "modules": [
            {
                "title": "Water Damage Fundamentals",
                "description": "Understanding water categories, classes of damage, and initial response protocols.",
                "lessons": [
                    {
                        "title": "Water Categories and Damage Classes",
                        "content_body": (
                            "This lesson covers the IICRC S500 standard classification "
                            "of water damage: Category 1 (clean water), Category 2 "
                            "(grey water), and Category 3 (black water), along with "
                            "Class 1 through Class 4 evaporation rates."
                        ),
                        "duration_minutes": 45,
                    },
                    {
                        "title": "Initial Response and Safety Protocols",
                        "content_body": (
                            "Learn the first-response procedures for water damage events "
                            "including electrical safety, PPE requirements, contamination "
                            "assessment, and emergency water extraction techniques."
                        ),
                        "duration_minutes": 40,
                    },
                ],
            },
            {
                "title": "Moisture Measurement",
                "description": "Instruments, techniques, and documentation for accurate moisture assessment.",
                "lessons": [
                    {
                        "title": "Moisture Meters and Thermal Imaging",
                        "content_body": (
                            "An overview of pin-type and pinless moisture meters, "
                            "infrared thermal imaging cameras, and thermo-hygrometers "
                            "used in water damage assessment. Covers calibration, "
                            "material-specific readings, and mapping techniques."
                        ),
                        "duration_minutes": 50,
                    },
                    {
                        "title": "Moisture Mapping and Documentation",
                        "content_body": (
                            "Learn to create moisture maps, record drying progress, "
                            "and produce compliant documentation for insurance claims "
                            "and IICRC audit purposes."
                        ),
                        "duration_minutes": 35,
                    },
                ],
            },
            {
                "title": "Drying Systems",
                "description": "Equipment selection, placement, and monitoring for effective structural drying.",
                "lessons": [
                    {
                        "title": "Dehumidifiers and Air Movers",
                        "content_body": (
                            "Covers LGR and desiccant dehumidifiers, axial and centrifugal "
                            "air movers, and heat injection systems. Includes equipment "
                            "placement strategies for Australian residential and commercial "
                            "structures."
                        ),
                        "duration_minutes": 55,
                    },
                    {
                        "title": "Drying Goals and Monitoring",
                        "content_body": (
                            "Setting drying goals based on material types, monitoring "
                            "daily progress using psychrometric calculations, and "
                            "determining when dry standard has been achieved per IICRC S500."
                        ),
                        "duration_minutes": 45,
                    },
                ],
            },
        ],
    },
    {
        "title": "Applied Structural Drying (ASD)",
        "slug": "asd-applied-structural-drying",
        "description": (
            "Advanced IICRC-approved course in structural drying science. "
            "Covers psychrometrics, equipment optimisation, and documentation "
            "for complex water damage restoration projects."
        ),
        "short_description": "Advanced structural drying with psychrometric science and IICRC CECs.",
        "price_aud": "1200.00",
        "is_free": False,
        "level": "advanced",
        "category": "Water Restoration",
        "iicrc_discipline": "ASD",
        "cec_hours": "12.0",
        "tags": ["iicrc", "asd", "structural-drying", "psychrometrics"],
        "modules": [
            {
                "title": "Psychrometrics",
                "description": "The science of air-moisture relationships and its application to drying.",
                "lessons": [
                    {
                        "title": "Understanding the Psychrometric Chart",
                        "content_body": (
                            "Detailed walkthrough of the psychrometric chart: dry bulb, "
                            "wet bulb, dew point, relative humidity, specific humidity, "
                            "grains per pound, and enthalpy. Practical exercises for "
                            "reading and plotting conditions."
                        ),
                        "duration_minutes": 60,
                    },
                    {
                        "title": "Calculating Drying Efficiency",
                        "content_body": (
                            "Using psychrometric data to calculate specific moisture "
                            "extraction rates, dehumidifier performance, and GPP "
                            "differentials to optimise drying equipment placement."
                        ),
                        "duration_minutes": 55,
                    },
                ],
            },
            {
                "title": "Structural Drying Principles",
                "description": "Advanced techniques for drying complex structures and materials.",
                "lessons": [
                    {
                        "title": "Drying Hardwood, Concrete, and Specialty Materials",
                        "content_body": (
                            "Techniques for drying hardwood floors, concrete slabs, "
                            "plaster walls, and specialty materials including stone "
                            "and engineered timber common in Australian construction."
                        ),
                        "duration_minutes": 50,
                    },
                    {
                        "title": "Contained and Directed Drying Systems",
                        "content_body": (
                            "Setting up containment zones, negative air pressure, "
                            "directed heat drying, and injection drying systems for "
                            "walls and sub-floor cavities."
                        ),
                        "duration_minutes": 45,
                    },
                ],
            },
            {
                "title": "Documentation & Validation",
                "description": "Professional documentation, reporting, and validation of drying outcomes.",
                "lessons": [
                    {
                        "title": "Daily Monitoring Reports and Drying Logs",
                        "content_body": (
                            "Creating compliant daily monitoring reports, equipment "
                            "logs, moisture reading records, and psychrometric data "
                            "sheets that meet IICRC and Australian insurance requirements."
                        ),
                        "duration_minutes": 40,
                    },
                    {
                        "title": "Final Validation and Project Close-Out",
                        "content_body": (
                            "Procedures for final moisture validation, pre-reconstruction "
                            "clearance testing, and assembling the complete project "
                            "documentation package for client handover."
                        ),
                        "duration_minutes": 35,
                    },
                ],
            },
        ],
    },
    {
        "title": "Applied Microbial Remediation Technician (AMRT)",
        "slug": "amrt-applied-microbial-remediation",
        "description": (
            "IICRC-approved course for mould and microbial remediation. "
            "Covers assessment, containment, removal, and clearance testing "
            "in accordance with the IICRC S520 standard."
        ),
        "short_description": "Professional mould remediation training with IICRC CECs.",
        "price_aud": "1500.00",
        "is_free": False,
        "level": "intermediate",
        "category": "Microbial Remediation",
        "iicrc_discipline": "AMRT",
        "cec_hours": "14.0",
        "tags": ["iicrc", "amrt", "mould", "remediation", "microbial"],
        "modules": [
            {
                "title": "Microbial Fundamentals",
                "description": "Biology of mould, bacteria, and other microbial contaminants in built environments.",
                "lessons": [
                    {
                        "title": "Mould Biology and Health Effects",
                        "content_body": (
                            "Understanding mould species common in Australian buildings, "
                            "their growth conditions, mycotoxin production, and health "
                            "effects including allergic reactions and respiratory issues."
                        ),
                        "duration_minutes": 50,
                    },
                    {
                        "title": "Microbial Assessment and Sampling",
                        "content_body": (
                            "Techniques for visual assessment, air sampling, surface "
                            "sampling (tape lift, swab, bulk), and interpreting "
                            "laboratory results for remediation planning."
                        ),
                        "duration_minutes": 45,
                    },
                ],
            },
            {
                "title": "Containment & Safety",
                "description": "Establishing safe work zones and PPE protocols for microbial remediation.",
                "lessons": [
                    {
                        "title": "Containment Setup and Negative Air",
                        "content_body": (
                            "Building containment barriers, establishing negative "
                            "air pressure with HEPA-filtered air scrubbers, and "
                            "decontamination chamber procedures per IICRC S520."
                        ),
                        "duration_minutes": 55,
                    },
                    {
                        "title": "PPE and Worker Safety in Mould Remediation",
                        "content_body": (
                            "Required PPE levels for different contamination conditions, "
                            "respiratory protection programs, and SafeWork Australia "
                            "requirements for microbial remediation workers."
                        ),
                        "duration_minutes": 40,
                    },
                ],
            },
            {
                "title": "Remediation Protocols",
                "description": "Removal, cleaning, and clearance procedures for microbial contamination.",
                "lessons": [
                    {
                        "title": "Source Removal and HEPA Vacuuming",
                        "content_body": (
                            "Procedures for removing mould-contaminated materials, "
                            "HEPA vacuuming surfaces, damp wiping with antimicrobial "
                            "solutions, and managing waste disposal."
                        ),
                        "duration_minutes": 50,
                    },
                    {
                        "title": "Clearance Testing and Post-Remediation Verification",
                        "content_body": (
                            "Post-remediation verification (PRV) procedures including "
                            "visual inspection, moisture confirmation, and clearance "
                            "air sampling to confirm successful remediation."
                        ),
                        "duration_minutes": 45,
                    },
                ],
            },
        ],
    },
    {
        "title": "Commercial Drying Specialist (CCT)",
        "slug": "cct-commercial-drying-specialist",
        "description": (
            "IICRC-approved Commercial Drying Specialist course for "
            "large-loss water damage projects. Covers commercial assessment, "
            "large-scale drying systems, and project management."
        ),
        "short_description": "Large-loss commercial drying and project management with IICRC CECs.",
        "price_aud": "2000.00",
        "is_free": False,
        "level": "advanced",
        "category": "Water Restoration",
        "iicrc_discipline": "CCT",
        "cec_hours": "16.0",
        "tags": ["iicrc", "cct", "commercial", "large-loss", "project-management"],
        "modules": [
            {
                "title": "Commercial Assessment",
                "description": "Assessing large commercial water damage events and developing restoration plans.",
                "lessons": [
                    {
                        "title": "Large-Loss Assessment and Scope of Work",
                        "content_body": (
                            "Conducting initial assessments of commercial water damage "
                            "events: building systems evaluation, business interruption "
                            "considerations, multi-floor damage mapping, and developing "
                            "comprehensive scopes of work."
                        ),
                        "duration_minutes": 60,
                    },
                    {
                        "title": "Insurance and Stakeholder Communication",
                        "content_body": (
                            "Managing communication with building owners, insurance "
                            "adjusters, consultants, and tenants. Documentation "
                            "requirements for large commercial claims in the "
                            "Australian insurance market."
                        ),
                        "duration_minutes": 45,
                    },
                ],
            },
            {
                "title": "Large-Scale Drying",
                "description": "Equipment strategies and logistics for drying commercial and industrial structures.",
                "lessons": [
                    {
                        "title": "Commercial Drying Equipment and Power Management",
                        "content_body": (
                            "Selecting and deploying commercial-grade dehumidifiers, "
                            "desiccant units, trailer-mounted systems, and managing "
                            "temporary power requirements for large-loss projects."
                        ),
                        "duration_minutes": 55,
                    },
                    {
                        "title": "Multi-Zone Drying Strategies",
                        "content_body": (
                            "Designing multi-zone drying plans for commercial buildings, "
                            "managing airflow across floors, working around occupied "
                            "spaces, and coordinating with building HVAC systems."
                        ),
                        "duration_minutes": 50,
                    },
                ],
            },
            {
                "title": "Project Management",
                "description": "Managing teams, timelines, and budgets for commercial restoration projects.",
                "lessons": [
                    {
                        "title": "Team Management and Job Scheduling",
                        "content_body": (
                            "Organising restoration crews for large-loss projects, "
                            "shift scheduling, sub-contractor coordination, and "
                            "maintaining quality control across multiple work zones."
                        ),
                        "duration_minutes": 50,
                    },
                    {
                        "title": "Budget Tracking and Project Close-Out",
                        "content_body": (
                            "Managing project budgets, equipment rental tracking, "
                            "progress billing, and assembling final project "
                            "documentation packages for commercial clients."
                        ),
                        "duration_minutes": 40,
                    },
                ],
            },
        ],
    },
    {
        "title": "Fire and Smoke Restoration Technician (FSRT)",
        "slug": "fsrt-fire-smoke-restoration",
        "description": (
            "IICRC-approved course covering fire and smoke damage restoration. "
            "Covers fire chemistry, odour control, structural cleaning, and "
            "contents restoration techniques."
        ),
        "short_description": "Fire and smoke damage restoration training with IICRC CECs.",
        "price_aud": "1800.00",
        "is_free": False,
        "level": "intermediate",
        "category": "Fire Restoration",
        "iicrc_discipline": "FSRT",
        "cec_hours": "14.0",
        "tags": ["iicrc", "fsrt", "fire", "smoke", "restoration", "odour"],
        "modules": [
            {
                "title": "Fire & Smoke Chemistry",
                "description": "Understanding combustion, smoke residues, and their effects on building materials.",
                "lessons": [
                    {
                        "title": "Combustion Science and Smoke Residue Types",
                        "content_body": (
                            "Understanding complete and incomplete combustion, types "
                            "of smoke residue (dry, wet, protein, fuel oil), and how "
                            "different fuel sources produce different residue patterns "
                            "requiring specific cleaning approaches."
                        ),
                        "duration_minutes": 50,
                    },
                    {
                        "title": "Fire Damage Assessment and Safety",
                        "content_body": (
                            "Conducting fire damage assessments: structural integrity "
                            "evaluation, identifying hazardous materials (asbestos, "
                            "lead paint), electrical safety, and working with fire "
                            "investigation authorities in Australia."
                        ),
                        "duration_minutes": 45,
                    },
                ],
            },
            {
                "title": "Odour Control",
                "description": "Techniques for eliminating smoke odours from structures and contents.",
                "lessons": [
                    {
                        "title": "Thermal Fogging and Ozone Treatment",
                        "content_body": (
                            "Using thermal foggers, ULV foggers, ozone generators, "
                            "and hydroxyl generators for odour counteraction. Safety "
                            "protocols, application rates, and limitations of each "
                            "technology."
                        ),
                        "duration_minutes": 50,
                    },
                    {
                        "title": "Sealing and Encapsulation for Persistent Odours",
                        "content_body": (
                            "When and how to apply sealers and encapsulants to lock "
                            "in residual odour on structural surfaces. Product "
                            "selection, surface preparation, and application techniques."
                        ),
                        "duration_minutes": 40,
                    },
                ],
            },
            {
                "title": "Structural Cleaning",
                "description": "Cleaning methods for fire-damaged structures and contents.",
                "lessons": [
                    {
                        "title": "Structural Surface Cleaning Methods",
                        "content_body": (
                            "Dry cleaning sponges, wet cleaning, abrasive cleaning, "
                            "and immersion cleaning techniques for walls, ceilings, "
                            "and structural surfaces. Matching cleaning methods to "
                            "residue type and surface material."
                        ),
                        "duration_minutes": 55,
                    },
                    {
                        "title": "Contents Cleaning and Pack-Out Procedures",
                        "content_body": (
                            "Contents inventory, pack-out procedures, electronics "
                            "cleaning, soft goods restoration (textiles, documents), "
                            "and managing contents storage and return logistics."
                        ),
                        "duration_minutes": 45,
                    },
                ],
            },
        ],
    },
]


# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------


def _post(path: str, data: dict) -> dict:
    """POST JSON to the backend and return the parsed response."""
    url = f"{BASE_URL}{path}"
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=HEADERS, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        print(f"  ERROR {exc.code} on POST {path}: {detail}")
        raise


def _patch(path: str, data: dict) -> dict:
    """PATCH JSON to the backend and return the parsed response."""
    url = f"{BASE_URL}{path}"
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=HEADERS, method="PATCH")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        print(f"  ERROR {exc.code} on PATCH {path}: {detail}")
        raise


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def seed_courses() -> None:
    print("=" * 60)
    print("CARSI LMS — Seeding 5 IICRC Courses")
    print("=" * 60)

    for course_def in COURSES:
        modules_def = course_def.pop("modules")
        slug = course_def["slug"]

        # 1. Create course (created as draft)
        print(f"\n--- Creating course: {course_def['title']}")
        try:
            course = _post("/api/lms/courses", course_def)
        except urllib.error.HTTPError as exc:
            if exc.code == 409:
                print(f"  Skipped (already exists): {slug}")
                continue
            raise
        course_id = course["id"]
        print(f"  Course ID: {course_id}")

        # 2. Create modules and lessons
        for mod_idx, mod_def in enumerate(modules_def):
            lessons_def = mod_def.pop("lessons")
            mod_payload = {
                "title": mod_def["title"],
                "description": mod_def.get("description"),
                "order_index": mod_idx,
                "is_preview": mod_idx == 0,  # first module is preview
            }
            print(f"  Module {mod_idx}: {mod_def['title']}")
            module = _post(f"/api/lms/courses/{slug}/modules", mod_payload)
            module_id = module["id"]

            for les_idx, les_def in enumerate(lessons_def):
                les_payload = {
                    "title": les_def["title"],
                    "content_type": "text",
                    "content_body": les_def.get("content_body", ""),
                    "duration_minutes": les_def.get("duration_minutes", 30),
                    "is_preview": mod_idx == 0 and les_idx == 0,
                    "order_index": les_idx,
                }
                print(f"    Lesson {les_idx}: {les_def['title']}")
                _post(f"/api/lms/modules/{module_id}/lessons", les_payload)

        # 3. Publish the course
        print(f"  Publishing: {slug}")
        _post(f"/api/lms/courses/{slug}/publish", {})
        print(f"  Published OK")

    print("\n" + "=" * 60)
    print("Seeding complete.")
    print("=" * 60)


if __name__ == "__main__":
    # Quick health check
    try:
        req = urllib.request.Request(f"{BASE_URL}/health")
        with urllib.request.urlopen(req, timeout=5) as resp:
            print(f"Backend health: {resp.status} OK")
    except Exception as exc:
        print(f"WARNING: Backend not reachable at {BASE_URL} — {exc}")
        print("The script will still attempt to run. Start the backend first.")
        print()

    try:
        seed_courses()
    except Exception as exc:
        print(f"\nFATAL: {exc}")
        sys.exit(1)
