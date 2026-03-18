"""
Seed the full CARSI course catalog — 15 additional IICRC courses.

Complements seed_iicrc_courses.py (WRT, ASD, AMRT, CCT, FSRT already seeded).
Adds: OCT, CRT, RCT, UFT, HST, CDS, ECTP, Lead, Asbestos, Emergency Response,
      Contents Restoration, Mould Testing, Insurance Claims, Trauma/Biohazard,
      Psychrometrics Masterclass.

Usage:
    cd C:/CARSI
    python scripts/seed_full_catalog.py

Requires: backend running at http://localhost:8000
"""

import json
import sys
import urllib.error
import urllib.request

import os
BASE_URL = os.environ.get("CARSI_API_URL", "http://localhost:8000")
ADMIN_USER_ID = "ecb3011b-04b8-462f-9a5f-2f2bedcf761f"  # admin@carsi.com.au
INSTRUCTOR_ID = "e879d5c4-5a69-4c03-8e5e-49b52eee13b7"  # Sarah Mitchell

HEADERS = {
    "Content-Type": "application/json",
    "X-User-Id": ADMIN_USER_ID,
}


def _post(path: str, payload: dict) -> dict:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{BASE_URL}{path}", data=data, headers=HEADERS, method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        raise RuntimeError(f"POST {path} -> {e.code}: {body}") from e


def _get(path: str) -> dict | None:
    req = urllib.request.Request(f"{BASE_URL}{path}", headers=HEADERS)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


COURSES = [
    # ------------------------------------------------------------------
    # OCT — Odour Control Technician
    # ------------------------------------------------------------------
    {
        "title": "Odour Control Technician (OCT)",
        "slug": "oct-odour-control-technician",
        "short_description": "Identify, treat and eliminate odours in restoration and cleaning scenarios.",
        "description": (
            "This IICRC-approved OCT course covers the science of odour, odour "
            "counteractants, ozone and hydroxyl generators, thermal fogging, and "
            "odour mapping techniques. Applicable to fire, mould, pet, tobacco and "
            "trauma odour situations across residential and commercial properties."
        ),
        "price_aud": "450.00",
        "is_free": False,
        "level": "intermediate",
        "category": "Odour Control",
        "iicrc_discipline": "OCT",
        "cec_hours": "6.0",
        "tags": ["iicrc", "oct", "odour", "restoration"],
        "modules": [
            {
                "title": "Module 1: The Science of Odour",
                "lessons": [
                    {"title": "How Odour Molecules Work", "content_type": "video", "duration_minutes": 30},
                    {"title": "Odour Classification and Sources", "content_type": "video", "duration_minutes": 25},
                    {"title": "Health & Safety Around Odourants", "content_type": "text", "duration_minutes": 20},
                    {"title": "Module 1 Assessment", "content_type": "quiz", "duration_minutes": 15},
                ],
            },
            {
                "title": "Module 2: Treatment Technologies",
                "lessons": [
                    {"title": "Ozone Generators: Application & Safety", "content_type": "video", "duration_minutes": 35},
                    {"title": "Hydroxyl Generators vs Ozone", "content_type": "video", "duration_minutes": 25},
                    {"title": "Thermal Fogging Techniques", "content_type": "video", "duration_minutes": 30},
                    {"title": "Odour Counteractants and Encapsulants", "content_type": "text", "duration_minutes": 20},
                ],
            },
            {
                "title": "Module 3: Scenario-Based Odour Removal",
                "lessons": [
                    {"title": "Post-Fire Smoke Odour Protocol", "content_type": "video", "duration_minutes": 30},
                    {"title": "Pet and Biological Odour Treatment", "content_type": "video", "duration_minutes": 25},
                    {"title": "Tobacco & Long-Term Odour Cases", "content_type": "text", "duration_minutes": 20},
                    {"title": "Final Assessment", "content_type": "quiz", "duration_minutes": 20},
                ],
            },
        ],
    },
    # ------------------------------------------------------------------
    # CRT — Colour Repair Technician
    # ------------------------------------------------------------------
    {
        "title": "Colour Repair Technician (CRT)",
        "slug": "crt-colour-repair-technician",
        "short_description": "Restore colour to carpets, upholstery and textiles damaged by bleach, fading and stains.",
        "description": (
            "The IICRC CRT course teaches colour theory, dye systems, spot dyeing, "
            "re-colouring bleach spots, and correcting colour damage on carpets, "
            "rugs, upholstery and hard surfaces. Includes hands-on dye matching "
            "exercises and coverage of common Australian fibre types."
        ),
        "price_aud": "395.00",
        "is_free": False,
        "level": "intermediate",
        "category": "Colour Repair",
        "iicrc_discipline": "CRT",
        "cec_hours": "5.0",
        "tags": ["iicrc", "crt", "colour", "carpet", "restoration"],
        "modules": [
            {
                "title": "Module 1: Colour Theory & Fibre Identification",
                "lessons": [
                    {"title": "Colour Wheel and Light Reflectance", "content_type": "video", "duration_minutes": 25},
                    {"title": "Identifying Carpet and Upholstery Fibres", "content_type": "video", "duration_minutes": 30},
                    {"title": "Dye Systems: Acid, Disperse & Fibre-Reactive", "content_type": "text", "duration_minutes": 20},
                ],
            },
            {
                "title": "Module 2: Bleach Spot & Stain Correction",
                "lessons": [
                    {"title": "Assessing Bleach Damage", "content_type": "video", "duration_minutes": 20},
                    {"title": "Spot Dyeing Technique — Wool & Nylon", "content_type": "video", "duration_minutes": 35},
                    {"title": "Correcting Fading and Sun Damage", "content_type": "video", "duration_minutes": 25},
                    {"title": "Module 2 Assessment", "content_type": "quiz", "duration_minutes": 15},
                ],
            },
            {
                "title": "Module 3: Whole-Carpet Re-Colouring",
                "lessons": [
                    {"title": "Re-Dyeing Process and Equipment", "content_type": "video", "duration_minutes": 40},
                    {"title": "Client Expectations and Scope Setting", "content_type": "text", "duration_minutes": 15},
                    {"title": "Final Certification Assessment", "content_type": "quiz", "duration_minutes": 20},
                ],
            },
        ],
    },
    # ------------------------------------------------------------------
    # RCT — Rug Cleaning Technician
    # ------------------------------------------------------------------
    {
        "title": "Rug Cleaning Technician (RCT)",
        "slug": "rct-rug-cleaning-technician",
        "short_description": "Specialist rug cleaning for wool, silk, cotton, and handmade rugs.",
        "description": (
            "The IICRC RCT course covers fibre identification, dye stability testing, "
            "rug construction, dry soil removal, washing methods, drying, fringe care, "
            "and odour treatment specific to fine area rugs. Learn how to handle "
            "antique, handmade, and machine-woven rugs safely."
        ),
        "price_aud": "425.00",
        "is_free": False,
        "level": "intermediate",
        "category": "Rug & Textile Cleaning",
        "iicrc_discipline": "RCT",
        "cec_hours": "6.0",
        "tags": ["iicrc", "rct", "rug", "cleaning"],
        "modules": [
            {
                "title": "Module 1: Rug Construction & Fibre Types",
                "lessons": [
                    {"title": "Hand-Knotted vs Machine-Made Rugs", "content_type": "video", "duration_minutes": 30},
                    {"title": "Wool, Silk, Cotton and Synthetic Fibres", "content_type": "video", "duration_minutes": 25},
                    {"title": "Dye Testing and Stability Checks", "content_type": "video", "duration_minutes": 20},
                ],
            },
            {
                "title": "Module 2: Cleaning Methods",
                "lessons": [
                    {"title": "Dry Soil Removal and Pre-Inspection", "content_type": "video", "duration_minutes": 25},
                    {"title": "Rug Washing — Full Submersion Method", "content_type": "video", "duration_minutes": 35},
                    {"title": "Controlled Drying and Fringe Care", "content_type": "video", "duration_minutes": 25},
                    {"title": "Module 2 Assessment", "content_type": "quiz", "duration_minutes": 15},
                ],
            },
            {
                "title": "Module 3: Stains, Odour and Special Cases",
                "lessons": [
                    {"title": "Pet Urine Treatment in Fine Rugs", "content_type": "video", "duration_minutes": 30},
                    {"title": "Red Wine, Tannin and Ink Removal", "content_type": "text", "duration_minutes": 20},
                    {"title": "Final Certification Assessment", "content_type": "quiz", "duration_minutes": 20},
                ],
            },
        ],
    },
    # ------------------------------------------------------------------
    # UFT — Upholstery & Fabric Cleaning Technician
    # ------------------------------------------------------------------
    {
        "title": "Upholstery & Fabric Cleaning Technician (UFT)",
        "slug": "uft-upholstery-fabric-cleaning",
        "short_description": "Clean and restore upholstered furniture, leather, and decorative fabrics.",
        "description": (
            "Learn how to clean, protect and restore a wide range of upholstery fabrics "
            "including wool, velvet, microfibre, leather and synthetic blends. Covers "
            "pre-inspection, soil removal, cleaning chemistry, drying, and dealing with "
            "common stains encountered in residential and commercial settings."
        ),
        "price_aud": "350.00",
        "is_free": False,
        "level": "beginner",
        "category": "Upholstery & Fabric",
        "iicrc_discipline": "UFT",
        "cec_hours": "4.0",
        "tags": ["iicrc", "uft", "upholstery", "fabric", "cleaning"],
        "modules": [
            {
                "title": "Module 1: Fabrics and Pre-Inspection",
                "lessons": [
                    {"title": "Identifying Upholstery Fibre Types", "content_type": "video", "duration_minutes": 25},
                    {"title": "Manufacturer Codes: W, S, WS, X", "content_type": "text", "duration_minutes": 20},
                    {"title": "Pre-Testing for Dye Stability", "content_type": "video", "duration_minutes": 20},
                    {"title": "Module 1 Assessment", "content_type": "quiz", "duration_minutes": 10},
                ],
            },
            {
                "title": "Module 2: Cleaning Leather and Specialty Fabrics",
                "lessons": [
                    {"title": "Leather Types and Cleaning Chemistry", "content_type": "video", "duration_minutes": 30},
                    {"title": "Velvet, Silk and Delicate Fabric Protocols", "content_type": "video", "duration_minutes": 25},
                    {"title": "Drying and Grooming Post-Clean", "content_type": "video", "duration_minutes": 15},
                ],
            },
            {
                "title": "Module 3: Stain Removal and Restoration",
                "lessons": [
                    {"title": "Common Stain Chemistry", "content_type": "text", "duration_minutes": 20},
                    {"title": "Stain Removal Sequence", "content_type": "video", "duration_minutes": 25},
                    {"title": "Final Certification Assessment", "content_type": "quiz", "duration_minutes": 15},
                ],
            },
        ],
    },
    # ------------------------------------------------------------------
    # HST — Health & Safety Technician
    # ------------------------------------------------------------------
    {
        "title": "Health & Safety Technician (HST)",
        "slug": "hst-health-safety-technician",
        "short_description": "Workplace health and safety fundamentals for restoration and cleaning professionals.",
        "description": (
            "The IICRC HST course covers WHS legislation, hazard identification, "
            "PPE selection, MSDS interpretation, confined space entry, working at "
            "heights, chemical safety, and emergency procedures. Essential for all "
            "restoration professionals in Australia."
        ),
        "price_aud": "295.00",
        "is_free": False,
        "level": "beginner",
        "category": "Health & Safety",
        "iicrc_discipline": "HST",
        "cec_hours": "4.0",
        "tags": ["iicrc", "hst", "safety", "whs", "restoration"],
        "modules": [
            {
                "title": "Module 1: WHS Legislation & Responsibilities",
                "lessons": [
                    {"title": "Work Health and Safety Act 2011 (AU)", "content_type": "text", "duration_minutes": 25},
                    {"title": "PCBU Duties and Worker Rights", "content_type": "video", "duration_minutes": 20},
                    {"title": "Incident Reporting Requirements", "content_type": "text", "duration_minutes": 15},
                    {"title": "Module 1 Assessment", "content_type": "quiz", "duration_minutes": 15},
                ],
            },
            {
                "title": "Module 2: Hazard Identification & PPE",
                "lessons": [
                    {"title": "Hazard and Risk Assessment Process", "content_type": "video", "duration_minutes": 30},
                    {"title": "PPE Selection for Restoration Scenarios", "content_type": "video", "duration_minutes": 25},
                    {"title": "Reading SDS and Chemical Labels", "content_type": "text", "duration_minutes": 20},
                ],
            },
            {
                "title": "Module 3: Site-Specific Hazards",
                "lessons": [
                    {"title": "Working in Confined Spaces", "content_type": "video", "duration_minutes": 25},
                    {"title": "Asbestos and Lead Awareness", "content_type": "text", "duration_minutes": 20},
                    {"title": "Biological Hazards in Restoration", "content_type": "video", "duration_minutes": 20},
                    {"title": "Final Certification Assessment", "content_type": "quiz", "duration_minutes": 20},
                ],
            },
        ],
    },
    # ------------------------------------------------------------------
    # CDS — Commercial Drying Specialist
    # ------------------------------------------------------------------
    {
        "title": "Commercial Drying Specialist (CDS)",
        "slug": "cds-commercial-drying-specialist",
        "short_description": "Advanced structural drying strategies for large commercial and industrial losses.",
        "description": (
            "Builds on ASD fundamentals to address the unique challenges of commercial "
            "drying projects: warehouses, multi-storey buildings, hotels and hospitals. "
            "Covers advanced equipment selection, psychrometric calculations at scale, "
            "project documentation, insurance reporting and team management."
        ),
        "price_aud": "650.00",
        "is_free": False,
        "level": "advanced",
        "category": "Commercial Restoration",
        "iicrc_discipline": "CDS",
        "cec_hours": "8.0",
        "tags": ["iicrc", "cds", "commercial", "drying", "restoration"],
        "modules": [
            {
                "title": "Module 1: Commercial Loss Assessment",
                "lessons": [
                    {"title": "Scoping Large Commercial Losses", "content_type": "video", "duration_minutes": 35},
                    {"title": "Building System Interactions (HVAC, Plumbing)", "content_type": "video", "duration_minutes": 30},
                    {"title": "Stakeholder Communication at Scale", "content_type": "text", "duration_minutes": 20},
                    {"title": "Module 1 Assessment", "content_type": "quiz", "duration_minutes": 15},
                ],
            },
            {
                "title": "Module 2: Advanced Equipment & Psychrometrics",
                "lessons": [
                    {"title": "High-Capacity Dehumidification Systems", "content_type": "video", "duration_minutes": 35},
                    {"title": "Psychrometric Calculations for Large Spaces", "content_type": "video", "duration_minutes": 30},
                    {"title": "Desiccant vs Refrigerant: Commercial Applications", "content_type": "video", "duration_minutes": 25},
                ],
            },
            {
                "title": "Module 3: Project Management & Reporting",
                "lessons": [
                    {"title": "Daily Monitoring Documentation at Scale", "content_type": "text", "duration_minutes": 25},
                    {"title": "Insurance Reporting for Large Losses", "content_type": "video", "duration_minutes": 30},
                    {"title": "Team Coordination and Subcontractor Management", "content_type": "video", "duration_minutes": 25},
                    {"title": "Final Certification Assessment", "content_type": "quiz", "duration_minutes": 25},
                ],
            },
        ],
    },
    # ------------------------------------------------------------------
    # Lead Awareness for Restoration Professionals
    # ------------------------------------------------------------------
    {
        "title": "Lead Awareness for Restoration Professionals",
        "slug": "lead-awareness-restoration",
        "short_description": "Identify, manage and safely work around lead-based paint in pre-1970 properties.",
        "description": (
            "Lead-based paint is common in Australian homes and commercial buildings "
            "constructed before 1970. This course covers lead identification, risk "
            "assessment, safe work practices, containment procedures, waste disposal "
            "and compliance with Safe Work Australia guidelines."
        ),
        "price_aud": "195.00",
        "is_free": False,
        "level": "beginner",
        "category": "Health & Safety",
        "iicrc_discipline": "HST",
        "cec_hours": "3.0",
        "tags": ["lead", "safety", "renovation", "restoration", "compliance"],
        "modules": [
            {
                "title": "Module 1: Lead in the Built Environment",
                "lessons": [
                    {"title": "History of Lead in Australian Buildings", "content_type": "text", "duration_minutes": 20},
                    {"title": "Identifying Lead-Based Paint", "content_type": "video", "duration_minutes": 25},
                    {"title": "Health Risks and Exposure Pathways", "content_type": "text", "duration_minutes": 20},
                ],
            },
            {
                "title": "Module 2: Safe Work Practices",
                "lessons": [
                    {"title": "PPE Requirements for Lead Work", "content_type": "video", "duration_minutes": 20},
                    {"title": "Containment and Decontamination", "content_type": "video", "duration_minutes": 25},
                    {"title": "Lead Waste Disposal (EPA Requirements)", "content_type": "text", "duration_minutes": 15},
                    {"title": "Final Assessment", "content_type": "quiz", "duration_minutes": 20},
                ],
            },
        ],
    },
    # ------------------------------------------------------------------
    # Asbestos Awareness in Restoration
    # ------------------------------------------------------------------
    {
        "title": "Asbestos Awareness in Restoration",
        "slug": "asbestos-awareness-restoration",
        "short_description": "Recognise asbestos-containing materials and comply with Australian removal regulations.",
        "description": (
            "Asbestos remains prevalent in Australian properties built before 1990. "
            "This course covers asbestos types, common locations in residential and "
            "commercial buildings, safe work practices during disturbance, legislative "
            "requirements under the Work Health and Safety Regulations, and when to "
            "engage a licensed removalist."
        ),
        "price_aud": "195.00",
        "is_free": False,
        "level": "beginner",
        "category": "Health & Safety",
        "iicrc_discipline": "HST",
        "cec_hours": "3.0",
        "tags": ["asbestos", "safety", "restoration", "compliance", "whs"],
        "modules": [
            {
                "title": "Module 1: Asbestos in Australian Buildings",
                "lessons": [
                    {"title": "Types of Asbestos and Where They Are Found", "content_type": "video", "duration_minutes": 25},
                    {"title": "Health Effects and Disease Pathways", "content_type": "text", "duration_minutes": 20},
                    {"title": "Identifying Suspected ACMs on Site", "content_type": "video", "duration_minutes": 20},
                ],
            },
            {
                "title": "Module 2: Safe Handling and Compliance",
                "lessons": [
                    {"title": "Non-Friable vs Friable Asbestos Rules", "content_type": "text", "duration_minutes": 20},
                    {"title": "PPE and Containment Requirements", "content_type": "video", "duration_minutes": 20},
                    {"title": "Licensing Requirements for Removal", "content_type": "text", "duration_minutes": 15},
                    {"title": "Final Assessment", "content_type": "quiz", "duration_minutes": 20},
                ],
            },
        ],
    },
    # ------------------------------------------------------------------
    # Emergency Response & Flood Recovery
    # ------------------------------------------------------------------
    {
        "title": "Emergency Response & Flood Recovery",
        "slug": "emergency-response-flood-recovery",
        "short_description": "First-response protocols for major flood events and large-scale water losses.",
        "description": (
            "Designed for restoration professionals responding to major flooding events, "
            "this course covers triage and prioritisation, rapid-deployment drying, "
            "category 3 water handling, electrical safety, structural stability assessment, "
            "and working within disaster-response frameworks. Incorporates lessons from "
            "Queensland and NSW flood events."
        ),
        "price_aud": "495.00",
        "is_free": False,
        "level": "advanced",
        "category": "Emergency Response",
        "iicrc_discipline": "WRT",
        "cec_hours": "7.0",
        "tags": ["emergency", "flood", "recovery", "wrt", "restoration"],
        "modules": [
            {
                "title": "Module 1: Disaster Scene Management",
                "lessons": [
                    {"title": "Incident Command System Basics", "content_type": "video", "duration_minutes": 30},
                    {"title": "Triage and Property Prioritisation", "content_type": "video", "duration_minutes": 25},
                    {"title": "Electrical & Structural Safety Assessment", "content_type": "video", "duration_minutes": 25},
                ],
            },
            {
                "title": "Module 2: Category 3 Water Operations",
                "lessons": [
                    {"title": "Category 3 Contamination Protocols", "content_type": "video", "duration_minutes": 30},
                    {"title": "PPE Requirements for Sewage and Floodwater", "content_type": "text", "duration_minutes": 20},
                    {"title": "Rapid-Deployment Drying Systems", "content_type": "video", "duration_minutes": 30},
                ],
            },
            {
                "title": "Module 3: Recovery Phase",
                "lessons": [
                    {"title": "Contents Salvage and Pack-Out Procedures", "content_type": "video", "duration_minutes": 25},
                    {"title": "Insurance Documentation at Scale", "content_type": "text", "duration_minutes": 20},
                    {"title": "Final Assessment", "content_type": "quiz", "duration_minutes": 25},
                ],
            },
        ],
    },
    # ------------------------------------------------------------------
    # Contents Restoration Technician
    # ------------------------------------------------------------------
    {
        "title": "Contents Restoration Technician",
        "slug": "contents-restoration-technician",
        "short_description": "Restore, document and return personal property after fire, flood and mould losses.",
        "description": (
            "Contents restoration is a high-value specialty within disaster recovery. "
            "This course covers pack-out and inventory procedures, cleaning methodology "
            "for electronics, textiles, documents and hard goods, odour treatment, "
            "storage requirements, client communication, and insurance claims processing "
            "for contents losses."
        ),
        "price_aud": "425.00",
        "is_free": False,
        "level": "intermediate",
        "category": "Contents Restoration",
        "iicrc_discipline": "FSRT",
        "cec_hours": "6.0",
        "tags": ["contents", "restoration", "pack-out", "insurance"],
        "modules": [
            {
                "title": "Module 1: Pack-Out and Inventory",
                "lessons": [
                    {"title": "Contents Inventory Systems and Software", "content_type": "video", "duration_minutes": 30},
                    {"title": "Photography and Documentation Standards", "content_type": "video", "duration_minutes": 20},
                    {"title": "Safe Packing and Transport", "content_type": "text", "duration_minutes": 15},
                ],
            },
            {
                "title": "Module 2: Cleaning Methodology by Category",
                "lessons": [
                    {"title": "Electronics — Assessment and Cleaning", "content_type": "video", "duration_minutes": 30},
                    {"title": "Textiles and Garment Restoration", "content_type": "video", "duration_minutes": 25},
                    {"title": "Art, Antiques and Sentimental Items", "content_type": "video", "duration_minutes": 25},
                    {"title": "Module 2 Assessment", "content_type": "quiz", "duration_minutes": 15},
                ],
            },
            {
                "title": "Module 3: Storage, Return & Claims",
                "lessons": [
                    {"title": "Climate-Controlled Storage Requirements", "content_type": "text", "duration_minutes": 15},
                    {"title": "Writing Contents Claims Reports", "content_type": "video", "duration_minutes": 25},
                    {"title": "Final Certification Assessment", "content_type": "quiz", "duration_minutes": 20},
                ],
            },
        ],
    },
    # ------------------------------------------------------------------
    # Mould Testing & Air Quality Assessment
    # ------------------------------------------------------------------
    {
        "title": "Mould Testing & Air Quality Assessment",
        "slug": "mould-testing-air-quality",
        "short_description": "Conduct professional mould inspections, air sampling and interpret laboratory results.",
        "description": (
            "Learn how to conduct thorough mould inspections, collect viable and "
            "non-viable air samples, surface tape lifts and bulk samples, use moisture "
            "mapping equipment, and interpret laboratory reports. Includes chain of "
            "custody procedures and how to communicate findings to clients and insurers."
        ),
        "price_aud": "550.00",
        "is_free": False,
        "level": "advanced",
        "category": "Mould & Indoor Air Quality",
        "iicrc_discipline": "AMRT",
        "cec_hours": "7.0",
        "tags": ["mould", "air-quality", "sampling", "amrt", "inspection"],
        "modules": [
            {
                "title": "Module 1: Mould Biology and Building Science",
                "lessons": [
                    {"title": "Mould Species Common in Australian Climates", "content_type": "video", "duration_minutes": 30},
                    {"title": "Moisture Sources and Building Envelope Failures", "content_type": "video", "duration_minutes": 25},
                    {"title": "Health Effects of Indoor Mould Exposure", "content_type": "text", "duration_minutes": 20},
                ],
            },
            {
                "title": "Module 2: Sampling Methods",
                "lessons": [
                    {"title": "Air Sampling: Spore Trap vs Culture Methods", "content_type": "video", "duration_minutes": 35},
                    {"title": "Surface Sampling: Tape Lift and Swab", "content_type": "video", "duration_minutes": 25},
                    {"title": "Chain of Custody and Lab Submission", "content_type": "text", "duration_minutes": 15},
                    {"title": "Module 2 Assessment", "content_type": "quiz", "duration_minutes": 15},
                ],
            },
            {
                "title": "Module 3: Reporting and Remediation Scoping",
                "lessons": [
                    {"title": "Interpreting Lab Reports", "content_type": "video", "duration_minutes": 30},
                    {"title": "Writing the Mould Assessment Report", "content_type": "text", "duration_minutes": 25},
                    {"title": "Scoping Remediation from Assessment Data", "content_type": "video", "duration_minutes": 25},
                    {"title": "Final Certification Assessment", "content_type": "quiz", "duration_minutes": 20},
                ],
            },
        ],
    },
    # ------------------------------------------------------------------
    # Insurance Claims Management for Restorers
    # ------------------------------------------------------------------
    {
        "title": "Insurance Claims Management for Restorers",
        "slug": "insurance-claims-management-restorers",
        "short_description": "Navigate insurance claims, write supplements and work effectively with loss adjusters.",
        "description": (
            "Understanding the insurance claims process is critical for restoration "
            "business profitability. This course covers policy interpretation, scope "
            "of works documentation, Xactimate pricing, supplement writing, working "
            "with loss assessors and adjusters, dispute resolution, and maximising "
            "legitimate claim value for your clients."
        ),
        "price_aud": "395.00",
        "is_free": False,
        "level": "intermediate",
        "category": "Business Skills",
        "iicrc_discipline": "WRT",
        "cec_hours": "5.0",
        "tags": ["insurance", "claims", "xactimate", "business", "restoration"],
        "modules": [
            {
                "title": "Module 1: Understanding Insurance Policies",
                "lessons": [
                    {"title": "Home and Strata Insurance Policy Structure", "content_type": "text", "duration_minutes": 25},
                    {"title": "Covered vs Non-Covered Events", "content_type": "video", "duration_minutes": 20},
                    {"title": "Depreciation, Betterment and Policy Limits", "content_type": "video", "duration_minutes": 20},
                ],
            },
            {
                "title": "Module 2: Documentation and Pricing",
                "lessons": [
                    {"title": "Scope of Works That Stands Up to Scrutiny", "content_type": "video", "duration_minutes": 30},
                    {"title": "Xactimate Line Items for Restoration", "content_type": "video", "duration_minutes": 35},
                    {"title": "Writing Effective Supplements", "content_type": "text", "duration_minutes": 25},
                    {"title": "Module 2 Assessment", "content_type": "quiz", "duration_minutes": 15},
                ],
            },
            {
                "title": "Module 3: Working with Loss Adjusters",
                "lessons": [
                    {"title": "The Loss Adjuster's Role and Incentives", "content_type": "video", "duration_minutes": 20},
                    {"title": "Negotiation and Dispute Resolution", "content_type": "video", "duration_minutes": 25},
                    {"title": "Final Assessment", "content_type": "quiz", "duration_minutes": 20},
                ],
            },
        ],
    },
    # ------------------------------------------------------------------
    # Trauma Scene & Biohazard Remediation
    # ------------------------------------------------------------------
    {
        "title": "Trauma Scene & Biohazard Remediation",
        "slug": "trauma-scene-biohazard-remediation",
        "short_description": "Safe remediation of trauma scenes, unattended deaths and biohazard incidents.",
        "description": (
            "Trauma scene remediation is a regulated specialty requiring specific "
            "training, PPE and disposal protocols. This course covers bloodborne "
            "pathogens, PPE and donning/doffing procedures, chemical disinfectants, "
            "regulated waste disposal, crime scene protocols, and the psychological "
            "aspects of working in traumatic environments. Compliant with Australian "
            "state biohazard legislation."
        ),
        "price_aud": "595.00",
        "is_free": False,
        "level": "advanced",
        "category": "Biohazard Remediation",
        "iicrc_discipline": "AMRT",
        "cec_hours": "8.0",
        "tags": ["trauma", "biohazard", "remediation", "safety", "specialised"],
        "modules": [
            {
                "title": "Module 1: Bloodborne Pathogens & Infection Control",
                "lessons": [
                    {"title": "Bloodborne Pathogen Fundamentals (HBV, HCV, HIV)", "content_type": "video", "duration_minutes": 30},
                    {"title": "PPE Selection and Donning/Doffing Protocol", "content_type": "video", "duration_minutes": 30},
                    {"title": "Decontamination and Personal Hygiene", "content_type": "text", "duration_minutes": 20},
                ],
            },
            {
                "title": "Module 2: Scene Assessment and Remediation",
                "lessons": [
                    {"title": "Unattended Death — Assessment Protocols", "content_type": "video", "duration_minutes": 30},
                    {"title": "Biohazard Identification and Containment", "content_type": "video", "duration_minutes": 25},
                    {"title": "Chemical Disinfectants: Selection and Application", "content_type": "text", "duration_minutes": 20},
                    {"title": "Module 2 Assessment", "content_type": "quiz", "duration_minutes": 15},
                ],
            },
            {
                "title": "Module 3: Waste Disposal, Legal & Wellbeing",
                "lessons": [
                    {"title": "Regulated Biological Waste Disposal (State Laws)", "content_type": "text", "duration_minutes": 20},
                    {"title": "Working with Police and Coroners", "content_type": "video", "duration_minutes": 20},
                    {"title": "Psychological Wellbeing in Trauma Work", "content_type": "video", "duration_minutes": 20},
                    {"title": "Final Certification Assessment", "content_type": "quiz", "duration_minutes": 25},
                ],
            },
        ],
    },
    # ------------------------------------------------------------------
    # Psychrometrics Masterclass
    # ------------------------------------------------------------------
    {
        "title": "Psychrometrics Masterclass",
        "slug": "psychrometrics-masterclass",
        "short_description": "Deep-dive into psychrometric science for optimal structural drying outcomes.",
        "description": (
            "Master the psychrometric chart, calculate grains per pound, understand "
            "dew point, vapour pressure and relative humidity, and apply these concepts "
            "to real drying scenarios. This masterclass bridges theory and practice for "
            "restoration professionals who want to move beyond rules-of-thumb and make "
            "data-driven drying decisions."
        ),
        "price_aud": "325.00",
        "is_free": False,
        "level": "advanced",
        "category": "Structural Drying",
        "iicrc_discipline": "ASD",
        "cec_hours": "5.0",
        "tags": ["psychrometrics", "drying", "asd", "science", "advanced"],
        "modules": [
            {
                "title": "Module 1: The Psychrometric Chart",
                "lessons": [
                    {"title": "Reading the Psychrometric Chart", "content_type": "video", "duration_minutes": 35},
                    {"title": "Dew Point, Wet Bulb and Dry Bulb Temperature", "content_type": "video", "duration_minutes": 30},
                    {"title": "Grains Per Pound — What It Really Means", "content_type": "text", "duration_minutes": 25},
                ],
            },
            {
                "title": "Module 2: Applying Psychrometrics to Drying",
                "lessons": [
                    {"title": "Calculating Dehumidifier Capacity Requirements", "content_type": "video", "duration_minutes": 35},
                    {"title": "Monitoring and Adjusting as Conditions Change", "content_type": "video", "duration_minutes": 30},
                    {"title": "Module 2 Assessment", "content_type": "quiz", "duration_minutes": 20},
                ],
            },
            {
                "title": "Module 3: Advanced Scenarios",
                "lessons": [
                    {"title": "Winter Drying: Cold Climate Challenges", "content_type": "video", "duration_minutes": 25},
                    {"title": "High-Humidity Environments (QLD, NT)", "content_type": "video", "duration_minutes": 25},
                    {"title": "Final Masterclass Assessment", "content_type": "quiz", "duration_minutes": 25},
                ],
            },
        ],
    },
    # ------------------------------------------------------------------
    # Carpet Cleaning Technician (CCT) — Residential
    # ------------------------------------------------------------------
    {
        "title": "Carpet Cleaning Technician (CCT) — Residential",
        "slug": "cct-carpet-cleaning-residential",
        "short_description": "Professional residential carpet cleaning methods, chemistry and stain removal.",
        "description": (
            "The IICRC CCT course for residential carpet cleaning covers fibre "
            "identification, pre-spray chemistry, hot water extraction, dry compound "
            "methods, stain treatment and carpet protection. Learn to clean wool, "
            "nylon, polyester and polypropylene carpets to the IICRC S100 standard."
        ),
        "price_aud": "375.00",
        "is_free": False,
        "level": "beginner",
        "category": "Carpet Cleaning",
        "iicrc_discipline": "CCT",
        "cec_hours": "5.0",
        "tags": ["iicrc", "cct", "carpet", "cleaning", "residential"],
        "modules": [
            {
                "title": "Module 1: Carpet Fibres and Pre-Inspection",
                "lessons": [
                    {"title": "Fibre Burn and Crush Tests", "content_type": "video", "duration_minutes": 25},
                    {"title": "Pre-Inspection Checklist and Client Communication", "content_type": "video", "duration_minutes": 20},
                    {"title": "Vacuuming and Dry Soil Removal", "content_type": "text", "duration_minutes": 15},
                ],
            },
            {
                "title": "Module 2: Cleaning Methods",
                "lessons": [
                    {"title": "Hot Water Extraction — Equipment and Technique", "content_type": "video", "duration_minutes": 35},
                    {"title": "Encapsulation and Dry Compound Methods", "content_type": "video", "duration_minutes": 25},
                    {"title": "Cleaning Wool and Delicate Carpets", "content_type": "video", "duration_minutes": 25},
                    {"title": "Module 2 Assessment", "content_type": "quiz", "duration_minutes": 15},
                ],
            },
            {
                "title": "Module 3: Stain Removal and Protection",
                "lessons": [
                    {"title": "Stain Chemistry and Treatment Sequences", "content_type": "video", "duration_minutes": 30},
                    {"title": "Carpet Protector Application", "content_type": "text", "duration_minutes": 15},
                    {"title": "Final Certification Assessment", "content_type": "quiz", "duration_minutes": 20},
                ],
            },
        ],
    },
]


def seed_course(course_def: dict) -> None:
    slug = course_def["slug"]

    # Idempotency check
    existing = _get(f"/api/lms/courses/{slug}")
    if existing:
        print(f"  Skipped (already exists): {slug}")
        return

    # Create course
    course_payload = {k: v for k, v in course_def.items() if k != "modules"}
    course_payload["instructor_id"] = INSTRUCTOR_ID
    course_payload["status"] = "draft"
    course = _post("/api/lms/courses", course_payload)
    course_slug = course.get("slug", slug)

    # Create modules + lessons
    total_lessons = 0
    for i, mod_def in enumerate(course_def["modules"], start=1):
        mod_payload = {
            "title": mod_def["title"],
            "description": mod_def.get("description", ""),
            "order_index": i,
        }
        module = _post(f"/api/lms/courses/{course_slug}/modules", mod_payload)
        module_id = module["id"]

        for j, les_def in enumerate(mod_def["lessons"], start=1):
            les_payload = {
                "title": les_def["title"],
                "content_type": les_def.get("content_type", "video"),
                "content_body": les_def.get("content_body", ""),
                "duration_minutes": les_def.get("duration_minutes", 20),
                "order_index": j,
                "is_preview": i == 1 and j == 1,
            }
            _post(f"/api/lms/modules/{module_id}/lessons", les_payload)
            total_lessons += 1

    # Publish
    _post(f"/api/lms/courses/{course_slug}/publish", {})
    print(f"  Seeded: {course_def['title']} ({total_lessons} lessons)")


def main() -> None:
    print(f"Seeding {len(COURSES)} additional courses into {BASE_URL}...")
    success = 0
    for course_def in COURSES:
        try:
            seed_course(course_def)
            success += 1
        except Exception as exc:
            print(f"  ERROR seeding {course_def['slug']}: {exc}")
    print(f"\nDone. {success}/{len(COURSES)} courses seeded.")


if __name__ == "__main__":
    main()
