-- ============================================================================
-- CARSI LMS Seed Data — Generated from WordPress Export
-- Generated: 2026-03-22T02:14:19.561Z
-- ============================================================================

-- NOTE: Run Alembic migrations first to create the schema
-- This seed file populates the LMS tables with WordPress course data

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Ensure roles exist (idempotent)
-- ----------------------------------------------------------------------------
INSERT INTO lms_roles (name, description)
VALUES
  ('admin', 'Full platform administrator'),
  ('instructor', 'Can create and manage courses'),
  ('student', 'Can enrol in and complete courses')
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Create default instructor (Phil Ashby — CARSI owner)
-- ----------------------------------------------------------------------------
INSERT INTO lms_users (id, email, hashed_password, full_name, is_active, is_verified)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'phil@carsi.com.au',
  '$2b$12$placeholder_hash_replace_me',  -- Replace with actual bcrypt hash
  'Phil Ashby',
  true,
  true
)
ON CONFLICT (email) DO NOTHING;

-- Grant admin and instructor roles
INSERT INTO lms_user_roles (user_id, role_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, id
FROM lms_roles WHERE name IN ('admin', 'instructor')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Insert courses from WordPress export
-- ----------------------------------------------------------------------------
INSERT INTO lms_courses (
  slug, title, description, short_description, thumbnail_url,
  instructor_id, status, price_aud, is_free, duration_hours,
  level, category, tags, iicrc_discipline, cec_hours, meta
) VALUES
  (
    'hvac-systems-and-indoor-air-quality',
    'HVAC Systems and Indoor Air Quality: What Every Technician Should Know',
    '<h3>Already Purchased This Course?</h3>
<p><a href="https://carsi.com.au/courses/hvac-systems-and-indoor-air-quality-what-every-technician-should-know/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;"><strong>Introduction to Course</strong></li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;"><strong>Module 1: Understanding the Basics of HVAC and Airflow</strong></li>
<li><strong>Module 2: Common HVAC Contaminants and Their Impact</strong></li>
<li><strong>Module 3: Filtration and Air Cleaning Technologies</strong></li>
<li><strong>Module 4: Ventilation: Fresh Air and IAQ</strong></li>
<li><strong>Module 5: HVAC Maintenance and Air Quality Outcomes</strong></li>
<li><strong>Module 6: Moisture Control and HVAC Systems</strong></li>
<li><strong>Module 7: Ductwork: Inspection, Cleaning, and Sealing</strong></li>
</ul>
</li>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li><strong>Module 8: HVAC and Odour Control</strong></li>
<li><strong>Module 9: Communicating IAQ Findings with Clients</strong></li>
</ul>
</li>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li><strong>Module 10: IAQ-Friendly HVAC Upgrades and Recommendations</strong></li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?










his course provides HVAC technicians with essential knowledge and practical skills to assess, maintain, and optimise indoor air quality (IAQ) through HVAC system performance. Covering everything from airflow fundamentals to contaminant control, the course explains how HVAC components can either improve or degrade indoor environments depending on their design and maintenance.
Technicians will learn how to identify common IAQ hazards—such as mould, d',
    'https://carsi.com.au/wp-content/uploads/2025/07/HVAC-SYSTEMS-INDOOR-AIR-QUALITY.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'draft',
    0,
    true,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":37590,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"","sale_price":""}'::jsonb
  ),
  (
    'dust-particulates-in-indoor-air',
    'Dust and Particulates in Indoor Air: Control and Cleaning Strategies',
    '<h3>Already Purchased This Course?</h3>
<p><a href="https://carsi.com.au/courses/dust-and-particulates-in-indoor-air-control-and-cleaning-strategies/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;"><strong>Introduction to Course</strong></li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;"><strong>Module 1: Understanding Indoor Particulates</strong></li>
<li><strong>Module 2: Health Impacts of Dust and Fine Particles</strong></li>
<li><strong>Module 3: How Dust Moves Through Indoor Environments</strong></li>
<li><strong>Module 4: Measuring Dust Levels and Airborne Particles</strong></li>
<li><strong>Module 5: Filtration Technologies and Effectiveness</strong></li>
<li><strong>Module 6: Cleaning Strategies for Dust Control</strong></li>
<li><strong>Module 7: HVAC Systems and Dust Management</strong></li>
</ul>
</li>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li><strong>Module 8: Source Control and Prevention Techniques</strong></li>
<li><strong>Module 9: Monitoring and Maintaining Air Quality Over Time</strong></li>
</ul>
</li>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li><strong>Module 10: Communicating Findings and Recommendations</strong></li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?










This course equips professionals with the knowledge and tools to identify, manage, and reduce indoor dust and particulate pollution across residential, commercial, and restoration environments. Participants will explore how particulates form, how they move, and their potential health impacts—including respiratory, cardiovascular, and cognitive effects.
The course covers measurement technologies like particle counters, filtration methods including H',
    'https://carsi.com.au/wp-content/uploads/2025/07/DUST-AND-PARTICULATES.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'draft',
    0,
    true,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":37584,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"","sale_price":""}'::jsonb
  ),
  (
    'using-air-scrubbers-and-afds',
    'Using Air Scrubbers and AFDs to Improve Job Site Air Quality',
    '<h3>Already Purchased This Course?</h3>
<p><a href="https://carsi.com.au/courses/using-air-scrubbers-and-afds-to-improve-job-site-air-quality/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;"><strong>Introduction to Course</strong></li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;"><strong>Module 1: Introduction to Air Filtration Devices (AFDs) and Air Scrubbers</strong></li>
<li><strong>Module 2: Components and Mechanics of AFDs</strong></li>
<li><strong>Module 3: Types of Filters and Their Functions</strong></li>
<li><strong>Module 4: Modes of Operation: Recirculation vs Negative Pressure</strong></li>
<li><strong>Module 5: Proper Setup and Placement on the Job Site</strong></li>
<li><strong>Module 6: Calculating Air Changes per Hour (ACH)</strong></li>
<li><strong>Module 7: Maintenance and Filter Management</strong></li>
</ul>
</li>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li><strong>Module 8: Safety Considerations and Compliance</strong></li>
<li><strong>Module 9: Monitoring Effectiveness on Site</strong></li>
</ul>
</li>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li><strong>Module 10: Communicating with Clients and Documenting Your Work</strong></li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?










This course provides restoration and remediation professionals with the practical knowledge needed to effectively use Air Filtration Devices (AFDs), also known as air scrubbers, to improve air quality on job sites. Participants will learn how AFDs function, when and where to deploy them, how to select and manage filters, and how to configure systems for both recirculation and negative pressure environments.
Through detailed modules, the course cove',
    'https://carsi.com.au/wp-content/uploads/2025/07/JOB-SITE-AIR-QUALITY.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'draft',
    0,
    true,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":37578,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"","sale_price":""}'::jsonb
  ),
  (
    'air-quality-and-odour',
    'Air Quality and Odour: Identification and Deodorisation Essentials',
    '<h3>Already Purchased This Course?</h3>
<p><a href="https://carsi.com.au/courses/air-quality-and-odour-identification-and-deodorisation-essentials/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;"><strong>Introduction to Course</strong></li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;"><strong>Module 1: What is Odour and Why it Matters</strong></li>
<li><strong>Module 2: Categories of Odours and Their Characteristics</strong></li>
<li><strong>Module 3: Common Indoor Sources of Odours</strong></li>
<li><strong>Module 4: Odour and Volatile Organic Compounds (VOCs)</strong></li>
<li><strong>Module 5: Assessment and Documentation Techniques</strong></li>
<li><strong>Module 6: Ventilation and Air Movement Considerations</strong></li>
<li><strong style="font-size: 16px;">Module 7: Deodorisation Methods and When to Use Them</strong></li>
</ul>
</li>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li><strong style="font-size: 16px;"><strong style="font-size: 16px;">Module 8: Equipment Setups for Odour Control</strong></strong></li>
<li><strong style="font-size: 16px;">Module 9: Safety, Occupant Communication, and Expectations</strong></li>
</ul>
</li>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li><strong>Module 10: Final Odour Clearance and Verification</strong></li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?










This course aims to provide restoration, cleaning, and HVAC professionals with the essential knowledge and practical skills needed to identify, assess, and effectively address indoor air quality issues related to odour. Through a comprehensive exploration of odour science, source identification, deodorisation methods, and air treatment technologies, participants will learn how to tackle odour problems at their root—not just mask them.
With a focus ',
    'https://carsi.com.au/wp-content/uploads/2025/07/air-quality-and-odour.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'draft',
    0,
    true,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    'OCT',
    NULL,
    '{"wp_id":37560,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"","sale_price":""}'::jsonb
  ),
  (
    'introduction-to-creating-a-clean-air-environment',
    'Introduction to Creating a Clean Air Environment',
    '<h3>Already Purchased This Course?</h3>
<p><a href="https://carsi.com.au/courses/introduction-to-creating-a-clean-air-environment-best-practices-for-final-clearance-and-handover/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;"><strong>Introduction to Creating a Clean Air Environment: Best Practices for Final Clearance and Handover</strong></li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;"><strong>Module 1: The Importance of Final Clearance in Air Quality Remediation</strong></li>
<li><strong>Module 2: The Role of Air Quality Testing in Final Clearance</strong></li>
<li><strong>Module 3: Visual Inspections and Documentation for Final Handover</strong></li>
<li><strong>Module 4: Final Clearance Equipment and Tools</strong></li>
<li><strong style="font-size: 16px;">Module 5: Best Practices for Handover and Client Communication</strong></li>
<li><strong>Quiz</strong></li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?










This course aims to provide restoration professionals with the essential knowledge and practical skills needed to ensure a clean air environment during final clearance and handover. Covering best practices in indoor air quality (IAQ) assessment, air testing, visual inspections, and effective client communication, the course guides learners through every critical step of the process. By the end, participants will be equipped to confidently verify IA',
    'https://carsi.com.au/wp-content/uploads/2025/05/CLEAN-AIR-ENVIRONMENT-COVER-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":36623,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'introduction-to-iaq-and-mould-understanding-airborne-spread',
    'Introduction to IAQ and Mould',
    '<h3>Already Purchased This Course?</h3>
<p><a href="https://carsi.com.au/courses/introduction-to-iaq-and-mould-understanding-airborne-spread-and-containment/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;"><strong>Introduction to IAQ and Mould: Understanding Airborne Spread and Containment</strong></li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;"><strong>Module 1: The Impact of Mould on Indoor Air Quality (IAQ)</strong></li>
<li><strong>Module 2: Understanding the Mechanisms of Mould Spread Through the Air</strong></li>
<li><strong>Module 3: Containment Strategies to Prevent Airborne Mould Spread</strong></li>
<li><strong>Module 4: Remediation Techniques for Mould and Airborne Spores</strong></li>
<li><strong>Module 5: Monitoring and Maintaining IAQ After Mould Remediation</strong></li>
<li><strong>Quiz</strong></li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?










This course aims to provide a foundational understanding of how mould impacts Indoor Air Quality (IAQ) and the risks associated with airborne mould spread.
Participants will explore how spores travel through air and HVAC systems, and learn effective containment and remediation strategies.
From recognising early signs of contamination to maintaining safe IAQ post-remediation, this course equips professionals with essential skills to protect both bui',
    'https://carsi.com.au/wp-content/uploads/2025/05/AIRBORNE-SPREAD-COVER-2.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":36565,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'introduction-to-improving-indoor-air-quality-after-waterdamage',
    'Introduction to Improving Indoor Air Quality After Water Damage',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-improving-indoor-air-quality-after-water-damage/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">
<p><strong>Introduction to Improving Indoor Air Quality After Water Damage</strong></p>
</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">
<p><strong>Module 1: The Impact of Water Damage on Indoor Air Quality</strong></p>
</li>
<li>
<p><strong>Module 2: Identifying Common Contaminants After Water Damage</strong></p>
</li>
<li>
<p><strong>Module 3: Tools and Techniques for Assessing Indoor Air Quality</strong></p>
</li>
<li>
<p><strong>Module 4: Remediation Techniques for Improving Indoor Air Quality</strong></p>
</li>
<li>
<p><strong>Module 5: Documenting and Reporting Air Quality Improvements</strong></p>
</li>
<li>
<p><strong>Quiz</strong></p>
</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?










This course aims to provide restoration professionals with essential knowledge and practical skills to identify, assess, and improve indoor air quality following water damage events.
Covering common contaminants such as mould, bacteria, VOCs, and allergens, the course explores how these pollutants impact health and building safety.
Through expert guidance on assessment tools, remediation techniques, and documentation practices, participants will be',
    'https://carsi.com.au/wp-content/uploads/2025/05/inproving-indoor-air-quality-after-water-damage-2.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":36512,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'introduction-to-monitoring-air-quality-job-site',
    'Introduction to Monitoring Air Quality on the Job Site',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-monitoring-air-quality-on-the-job-site/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">
<p><strong>Introduction to Monitoring Air Quality on the Job Site</strong></p>
</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">
<p><strong>Module 1: Understanding Air Quality and Its Importance in Restoration</strong></p>
</li>
<li>
<p><strong>Module 2: Common Contaminants Found on Job Sites</strong></p>
</li>
<li>
<p><strong>Module 3: Tools and Equipment for Monitoring Air Quality</strong></p>
</li>
<li>
<p><strong>Module 4: Safety Measures and Protocols for Handling Poor Air Quality</strong></p>
</li>
<li>
<p><strong>Module 5: Documenting and Reporting Air Quality on Site</strong></p>
</li>
<li>
<p><strong>Quiz</strong></p>
</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?










This course aims to provide cleaning and restoration professionals with the essential skills to monitor and manage air quality on job sites. Understanding the impact of contaminants such as mould, dust, VOCs, asbestos, and toxic gases is crucial for maintaining a safe and effective work environment.
The course covers the tools and equipment used to measure air quality, safety protocols for handling hazardous conditions, and best practices for docum',
    'https://carsi.com.au/wp-content/uploads/2025/04/AIR-QUALITY-JOB-SITE-COVER-2.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":36456,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'introduction-to-air-quality-fundamentals',
    'Introduction to Air Quality Fundamentals',
    '<h3>Already Purchased This Course?</h3>
<p><a href="https://carsi.com.au/courses/introduction-to-air-quality-fundamentals/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;"><strong>Introduction to Air Quality Fundamentals for Restoration and Cleaning Professionals</strong></li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;"><strong>Module 1: Understanding Indoor Air Quality (IAQ)</strong></li>
<li><strong>Module 2: Common Indoor Air Contaminants in Restoration and Cleaning</strong></li>
<li><strong>Module 3: Ventilation and Air Exchange Principles</strong></li>
<li><strong>Module 4: Air Quality Monitoring and Assessment Tools</strong></li>
<li><strong>Module 5: Strategies to Improve and Maintain Air Quality</strong></li>
<li><strong>Quiz</strong></li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?










This foundational course introduces restoration and cleaning professionals to the essential principles of indoor air quality (IAQ). You&#8217;ll learn how everyday tasks—from water damage restoration to post-construction cleaning—can impact the air we breathe.
Through five practical modules, you’ll explore common indoor contaminants, ventilation and pressure control, air monitoring tools, and strategies to improve and maintain healthy air during an',
    'https://carsi.com.au/wp-content/uploads/2025/04/air-quality-cover-2.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":36397,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'antiques',
    'Introduction to Restoration of Antiques and Fine Furnishings',
    '<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-restoration-of-antiques-and-fine-furnishings/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Material Integrity Risks</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Handling Precautions</li>
<li>Cleaning Technique Selection</li>
<li>Restorative Methodologies</li>
<li>Authentication and Appraisals</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?










This course aims to provide a basic but comprehensive understanding of the risks and techniques involved in the restoration of antique and delicate furniture exposed to moisture and environmental fluctuations.
Covering material integrity challenges like bonding damage, fungal colonization, and chemical degradation, it also includes handling precautions, cleaning methods, and restorative techniques.
With a focus on maintaining authenticity, the cour',
    'https://carsi.com.au/wp-content/uploads/2024/11/ANTIQUES-COURSE.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":34621,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"0","sale_price":""}'::jsonb
  ),
  (
    'submerged-items-recovery',
    'Introduction to Recovery of Submerged Items and Contents',
    '<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-recovery-of-submerged-items-and-contents/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Evaluating Restorability</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Recovery Logistics</li>
<li>Initial Preservation</li>
<li>Cleaning Methods</li>
<li>Functionality Validation</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?










This course aims to provide a comprehensive framework for evaluating and restoring assets affected by water damage, guiding participants through the critical stages of restoration.
It covers assessing materials&#8217; restorability based on composition, contamination, and damage history, alongside recovery logistics such as safety protocols, specialized equipment, and transport protection.
Additionally, it delves into preservation techniques, inclu',
    'https://carsi.com.au/wp-content/uploads/2024/11/SUBMERGED-ITEMS-COURSE.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":34618,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"0","sale_price":""}'::jsonb
  ),
  (
    'drying-transportation',
    'Introduction to Drying Transportation and Vehicles',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-drying-transportation-and-vehicles/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Flooded Vehicle Considerations</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Drying Dynamics</li>
<li>Protecting Contents</li>
<li>Monitoring and Validation</li>
<li>Reconstitution Procedures</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?










This course aims to provide a comprehensive understanding of drying techniques and restoration strategies specifically for transportation and vehicles affected by flooding.
Participants will learn about key considerations in handling flooded vehicles, such as addressing electrical system damage, corrosion potentials, and contaminant residues.
The course also covers advanced drying dynamics, including ventilation and airflow management, and provides',
    'https://carsi.com.au/wp-content/uploads/2024/11/Copy-of-Copy-of-Copy-of-Copy-of-Live-AI-course-graphic-idea-3.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":34597,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"0","sale_price":""}'::jsonb
  ),
  (
    'industrial-2',
    'Introduction to Drying Industrial and Manufacturing Sites',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-drying-industrial-and-manufacturing-sites/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Production Considerations</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazard Communication</li>
<li>Reconstituting Operations</li>
<li>Drying Complex Materials</li>
<li>Achieving Regulatory Compliance</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?









This course aims to equip healthcare facility managers and emergency response teams with essential strategies for managing facility disruptions and maintaining regulatory compliance. Participants will learn to minimize operational, financial, and reputational risks through moisture control, microbial prevention, and quality standards maintenance.
Key topics include business interruption management, equipment protection, regulatory updates, and clear',
    'https://carsi.com.au/wp-content/uploads/2024/10/INDUSTRIAL-SITE-COURSE-2.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":34467,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"0","sale_price":""}'::jsonb
  ),
  (
    'educational',
    'Introduction to Drying Educational and Institutional Sites',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-drying-educational-and-institutional-sites/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Special Design Features</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Shared Infrastructure</li>
<li>Building Population Factors</li>
<li>Regulatory Oversight</li>
<li>Loss Limitation Tactics</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?









This course aims to provide professionals with critical strategies for managing drying processes in educational, institutional, and healthcare settings, addressing complex challenges such as infrastructure protection, health and accessibility needs, research continuity, and regulatory compliance. Topics cover safeguarding sensitive environments—such as laboratories, data centers, and auditoriums—while ensuring environmental controls, power distribut',
    'https://carsi.com.au/wp-content/uploads/2024/10/EDUCATIONAL-SITES-COURSE-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":34432,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"0","sale_price":""}'::jsonb
  ),
  (
    'hospitality',
    'Introduction to Drying Hospitality and Lodging Sites',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-drying-hospitality-and-lodging-sites/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Business Operations Impacts</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Room and Content Considerations</li>
<li>Stuctural Repair Stating</li>
<li>Reconstructive Constraints</li>
<li>Remediation Clean Up</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?

























This course, Introduction to Drying Hospitality and Lodging Sites, aims to provide a comprehensive understanding of the operational and structural impacts of water damage in hospitality venues.
Participants will learn how to manage revenue interruptions, booking displacements, and utility infrastructure challenges specific to lodging sites. The course also covers strategies for protecting room contents, restoring historical decor, an',
    'https://carsi.com.au/wp-content/uploads/2024/10/HOSPITALITY-SITES-COURSE.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":34427,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"0","sale_price":""}'::jsonb
  ),
  (
    'collaborative-development-your-personal-ai-assistant',
    'COLLABORATIVE DEVELOPMENT - YOUR PERSONAL AI ASSISTANT!!',
    '<p>The Collaborative Development GPT tool enables real-time teamwork on tasks like coding, content creation, and project management, providing better information for improved outcomes with features like version control, task tracking, and instant feedback.</p>
<p>Course courtesy of <a href="https://www.carsi.com.au">www.carsi.com.au</a></p>
',
    'The Collaborative Development GPT tool enables real time teamwork on tasks like coding, content creation, and project management, providing better information for improved outcomes with features like version control, task tracking and instant feedback.',
    'https://carsi.com.au/wp-content/uploads/2024/10/Copy-of-Add-a-heading.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    49,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":34150,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"}],"wp_tags":[],"original_price":"49","sale_price":""}'::jsonb
  ),
  (
    'drying-healthcare',
    'Introduction to Drying Health Care Facilities',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-drying-health-care-facilities/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Introduction to Drying Health Care Facilities</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Special Design Considerations</li>
<li>Unique Building Systems</li>
<li>Infection Control Risks</li>
<li>Maintaining Critical Operations</li>
<li>Remediation Standards</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?

























This course aims to provide a foundational understanding of the essential principles and practices involved in drying healthcare facilities.
The modules will cover special design considerations, unique building systems, infection control risks, maintaining critical operations, and adherence to remediation standards.







 
Course Duration:
Approx 1 Hour',
    'https://carsi.com.au/wp-content/uploads/2024/09/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-INTRO-SERIES-MEMBERSHIP.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":33624,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"0","sale_price":""}'::jsonb
  ),
  (
    'ultraviolet',
    'Introduction to Ultraviolet Light and Fluorescence',
    '<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-ultraviolet-light-and-fluorescence/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Introduction to Ultraviolet Light and Fluorescence</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Ultraviolet Light Spectrum</li>
<li>Fluorescence Principles</li>
<li>Equipment Application</li>
<li>Water Loss Inspection Uses</li>
<li>Complimentary Technologies</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?

























This course aims to provide a basic but comprehensive understanding of ultraviolet light spectrum applications and safety in water loss inspections.
It covers the properties of UVA, UVB, and UVC light, their fluorescence principles, and the protective measures required for safe use.
Participants will also explore equipment types, moisture detection, microbial growth identification, and complementary technologies such as infrared ther',
    'https://carsi.com.au/wp-content/uploads/2024/09/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-INTRO-SERIES-MEMBERSHIP.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":33606,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"0","sale_price":""}'::jsonb
  ),
  (
    'infrared',
    'Introduction to Infrared Thermography for Drying',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-infrared-thermography-for-drying/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Introduction to Infrared Thermography for Drying</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Thermal Energy Concepts</li>
<li>Infrared Camera Technologies</li>
<li>Moisture Detection Applications</li>
<li>Safely Applying Thermography</li>
<li>Result Analysis and Applications</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
























This course aims to provide a basic but comprehensive understanding of thermal energy concepts and infrared thermography for moisture detection and drying in restoration. It covers heat transfer principles, surface temperature dynamics, and emissivity effects, alongside infrared camera technologies and moisture detection applications. Participants will also learn about thermography safety protocols, result analysis, and the integratio',
    'https://carsi.com.au/wp-content/uploads/2024/09/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-INTRO-SERIES-MEMBERSHIP-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":33598,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"0","sale_price":""}'::jsonb
  ),
  (
    'litigation-support',
    'Introduction to Water Damage Litigation Support',
    '<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-water-damage-litigation-support/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Introduction to Water Damage Litigation Support</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Forensic Investigations</li>
<li>Data Gathering</li>
<li>Scope Analysis</li>
<li>Report Creation</li>
<li>Legal Proceedings</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?

























This course aims to provide a basic but comprehensive understanding of forensic investigations in the restoration industry. 
Participants will explore moisture source tracing, material failure analysis, and code compliance assessments. Through data gathering techniques like psychrometric records and sensor mapping, alongside scope analysis and report creation, the course offers insights into legal proceedings, evidence management, an',
    'https://carsi.com.au/wp-content/uploads/2024/09/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-INTRO-SERIES-MEMBERSHIP.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":33589,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"0","sale_price":""}'::jsonb
  ),
  (
    'advanced-applied',
    'Introduction to Advanced Applied Structural Drying',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-advanced-applied-structural-drying/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Introduction to Advanced Applied Structural Drying</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Psychrometric Analysis</li>
<li>Drying Strategy Development</li>
<li>Moisture Removal Techniques</li>
<li>Monitoring Drying Progress</li>
<li>Verifying Completion</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?

This course aims to provide restoration professionals with basic but comprehensive skills in psychrometric analysis, drying strategy development, and moisture removal techniques.
Topics include airflow calculations, microclimate mapping, sensor integration, and managing energy loads.
Additionally, it covers developing efficient drying strategies, using supplemental devices, and monitoring drying progress to ensure successful moisture removal.
Finally, parti',
    'https://carsi.com.au/wp-content/uploads/2024/09/Copy-of-Copy-of-Copy-of-INTRO-SERIES-MEMBERSHIP-17-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":33580,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"0","sale_price":""}'::jsonb
  ),
  (
    'asbestos',
    'Introduction to Asbestos: Asbestos Awareness',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-asbestos-asbestos-awareness/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Introduction to Asbestos: Asbestos Awareness</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">History and Use of Asbestos</li>
<li>Dangers of Asbestos</li>
<li>Types of Asbestos Containing Materials</li>
<li>Handling Asbestos Containing Materials</li>
<li>Containing Asbestos if Damaged or Identified</li>
<li>Reporting and Documentation</li>
<li>Training and Certification</li>
<li>Legal and Regulatory Requirements</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?

The Asbestos Awareness Course aims to offer a thorough introduction to asbestos, its types, history, and the associated health risks. It covers the identification of asbestos-containing materials, proper handling procedures, and the importance of personal protective equipment (PPE). The course also emphasizes legal compliance, advanced training, and certification requirements, ensuring safe asbestos management and abatement in construction and restoration w',
    'https://carsi.com.au/wp-content/uploads/2024/08/Copy-of-Copy-of-INTRO-SERIES-MEMBERSHIP.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":33203,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'adjusters',
    'Insurance Adjusters and Their Roles',
    '',
    'Insurance Adjusters and Their Roles
UNDERSTANDING THE SPECIFIC ROLE AND AUTHORITY OF INSURANCE ADJUSTERS.',
    'https://carsi.com.au/wp-content/uploads/2024/08/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-3.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":32293,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":59,"name":"Free Courses | Start Learning Restoration with CARSI","slug":"free-courses"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":62,"name":"Membership","slug":"membership"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"}],"wp_tags":[],"original_price":"0","sale_price":""}'::jsonb
  ),
  (
    'dehumidifiers',
    'Refrigerant Dehumidifiers for Water Loss Restoration',
    '<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/refrigerant-dehumidifiers-for-water-loss-restoration-a-beginners-guide/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Introduction to Refrigerant Dehumidifiers</li>
<li>Low Grain Refrigerant Technology</li>
<li>Sizing and Calculating Dehumidifier Requirements</li>
<li>Operating Temperatures and Efficiency</li>
<li>Refrigerants Used in Modern Dehumidifiers</li>
<li>Essential Accessories for Dehumidifiers</li>
<li>Maintenance and Care</li>
<li>Practice Application in Water Loss Scenarios</li>
<li>Safety Considerations</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?

This course aims to provide a comprehensive understanding of refrigerant dehumidifiers for water loss restoration. It covers the fundamentals of refrigerant dehumidifiers, including popular models from Phoenix, Dri-Eaz, and Ecor Pro, and delves into Low Grain Refrigerant (LGR) technology. Participants will learn to size and calculate dehumidifier requirements, optimize operating temperatures, and select essential accessories. The course includes practical a',
    'https://carsi.com.au/wp-content/uploads/2024/07/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-6.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":32020,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"0","sale_price":""}'::jsonb
  ),
  (
    'timber-drying',
    'Timber Drying Systems Assistance',
    '',
    'Timber Drying Systems Assistance
Add to cart for a downloadable version!',
    'https://carsi.com.au/wp-content/uploads/2024/07/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-3.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":31660,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":59,"name":"Free Courses | Start Learning Restoration with CARSI","slug":"free-courses"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":62,"name":"Membership","slug":"membership"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"}],"wp_tags":[],"original_price":"0","sale_price":""}'::jsonb
  ),
  (
    'heat-drying',
    'Heat Drying Systems Assistance',
    '',
    'Heat Drying Systems Assistance
Add to cart for a downloadable version!',
    'https://carsi.com.au/wp-content/uploads/2024/07/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-2.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":31656,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":59,"name":"Free Courses | Start Learning Restoration with CARSI","slug":"free-courses"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":62,"name":"Membership","slug":"membership"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"}],"wp_tags":[],"original_price":"0","sale_price":""}'::jsonb
  ),
  (
    'timber-floor',
    'Timber Floor Drying Assistance',
    '',
    'Timber Floor Drying Assistance
Add to cart for a downloadable version!',
    'https://carsi.com.au/wp-content/uploads/2024/07/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":31646,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":59,"name":"Free Courses | Start Learning Restoration with CARSI","slug":"free-courses"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":62,"name":"Membership","slug":"membership"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"}],"wp_tags":[],"original_price":"0","sale_price":""}'::jsonb
  ),
  (
    'using-atp-to-create-protocols-ccw',
    'Using ATP to Create Protocols - CCW',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/using-atp-to-create-protocols/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">ATP Terminology</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hygiene Monitoring</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">ATP and Protocols</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Testing Protocols</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Examples</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Quiz</li>
</ul>
',
    'What can you expect from this Course?
Cleaners are essential workers, and require increased training and knowledge in health cleaning. It is now more important than ever that you realise the enormous responsibility and reliance on your skills and knowledge.
This course is suited to those needing to test the efficiency and effectiveness of their cleaning protocols. It can assist in verifying chemicals, tools, and application methods to ensure that you are cleaning for health and not just removing',
    'https://carsi.com.au/wp-content/uploads/2021/02/ATP.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    20,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31365,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"20","sale_price":""}'::jsonb
  ),
  (
    'standard-operating-procedures-sop-course-ccw',
    'Standard Operating Procedures (SOP) Course - CCW',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/standard-operating-procedures-sop/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Standard Operating Procedures</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Standard Operating Procedures from The Professional Carpet Cleaners and Restorers Podcast</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide an overview of the process writing required by the organizations in question, regulatory agencies, to be able to provide and maintain a safe working environment. Learn the how&#8217;s and whys in this FREE course complimented at the end with our &#8216;Standard operating procedures from the Professional Carpet cleaners and restorers podcast.&#8217;
Course Duration
Approximately 1 Hour
Continuing Education Credit:
This course is ap',
    'https://carsi.com.au/wp-content/uploads/2022/03/STANDARD-OPERATING.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    20,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31361,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"20","sale_price":""}'::jsonb
  ),
  (
    'safety-data-sheet-sds-course-ccw',
    'Safety Data Sheet (SDS) Course - CCW',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/safety-data-sheets-course/"><br />
Access Here<br />
</a></p>
',
    'What can you expect from this Course?
This course aims to provide an overview of the process writing required by the organizations in question, regulatory agencies, to be able to provide and maintain a safe working environment. Learn the how&#8217;s and whys in this FREE course complimented at the end with our &#8216;Standard operating procedures from the Professional Carpet cleaners and restorers podcast&#8217;!
Course Duration:
Approximately 1.15 Hours
Continuing Education Credit:
This course ',
    'https://carsi.com.au/wp-content/uploads/2021/05/SAFETY-DATA.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    20,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31356,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"20","sale_price":""}'::jsonb
  ),
  (
    'safe-work-method-statements-swms-course-ccw',
    'Safe Work Method Statements (SWMS) Course - CCW',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/safe-work-method-statements-swms-course/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safe Work Method Statements</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safe Work Method Statements with the Professional Carpet Cleaners and Restorers Podcast</li>
</ul>
',
    'What can you expect from this Course?
This course will help you understand the Safe work method statement document and how it is used to help prevent illness and injury at work. Enjoy the included &#8216;safe work method statement with the Professional Carpet cleaners and Restorers Podcast&#8217;!
Course Duration:
Approximately 1 Hour
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 1 Hour
Once completed please email support@carsi.com.au for your',
    'https://carsi.com.au/wp-content/uploads/2022/03/SAFE-WORK.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    20,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31352,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":59,"name":"Free Courses | Start Learning Restoration with CARSI","slug":"free-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"20","sale_price":""}'::jsonb
  ),
  (
    'risk-assessment-course-ccw',
    'Risk Assessment Course - CCW',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/risk-assessment-course/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Introduction to WH&amp;S</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazards and Risks</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazard Identification</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Managing Risks</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Risk Matrix</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Job Safety and Environmental Analysis</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safe Work Method Statements</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">WH&amp;S Communication and Consultation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Quiz</li>
</ul>
',
    'What can you expect from this Course?
Risk Management is one of the most important aspects within an organisation. It is a LEGAL obligation under the Workplace Health and Safety Act that all staff are trained to manage WHS risks.
CARSI&#8217;s Risk Assessment Course aims to improve the participants awareness and knowledge on managing risks. The objectives of this course include, increase awareness of the need to identify hazards, Improve the ability to identify hazards within the workplace, incr',
    'https://carsi.com.au/wp-content/uploads/2021/09/RISK-ASSESSMENT.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    99,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31348,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"99","sale_price":""}'::jsonb
  ),
  (
    'neosan-labs-product-training-course-ccw',
    'NeoSan Labs Product Training - CCW',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/neosan-labs-product-training/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">The History of Neosan Labs</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Understanding Chemicals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazardous Chemicals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Managing Risks for Hazardous Chemicals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Product Breakdown: Part B Hydrogen Peroxide</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Product Breakdown: Part A Cationic Surfactants</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Surfactants</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety Data Sheets</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Training and Application</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Calculations and Mixing</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Ultra Low Volume ULV Foggers</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Victory Innovations</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazard Identification</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Risk Assessments</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hierarchy of Controls</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Standard Operating Procedures</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Job Safety and Environmental Analysis</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safe Work Method Statements</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Business Growth, Sustainability and Opportunity</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Multi Resistant Organisms (MROs)</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">How Hospitals Stay Hygienic</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">How Effective are Cleaning Measures?</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Neosan Labs 1</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Neosan Labs 2</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Neosan Labs 3</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Neosan Labs 4</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">References and Documents</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Quiz</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide you with an understanding of the history behind Neosan Labs, how they work and what they leave behind. Obtain an understanding of the different types of chemicals and how they are effectively used.
Course Duration:
Approximately 4.5 Hours
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 5 Hours
Once completed please email support@carsi.com.au for your Certificate of completion conf',
    'https://carsi.com.au/wp-content/uploads/2021/02/NEOSAN.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    99,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31344,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"99","sale_price":""}'::jsonb
  ),
  (
    'moisture-meter-course-ccw',
    'Moisture Meter Course - CCW',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/moisture-meter-training/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">How Moisture Was Read</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">The Process</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Ensuring Accuracy</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Reference Scale</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Temperatures</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Wood Warping Causes</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Moisture Testing</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Moisture Prevention</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Tips for Using a Moisture Meter</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Moisture Meter Accuracy</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Temperature and Accuracy</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Materials</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Factors</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">The Type of Meter</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">The Type of Material</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Maintenance of The Meter</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Mistakes with Moisture Meters</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Different Types</li>
</ul>
',
    'What can you expect from this Course?
Do you currently use moisture meters? Do you want to build your confidence in your knowledge and understanding of moisture meters and learn how they work?
Then join us in this course to expand your knowledge further.
Course Duration:
Approximately 2.5 Hours
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 3 Hours
Once completed please email support@carsi.com.au for your Certificate of completion confirming yo',
    'https://carsi.com.au/wp-content/uploads/2021/03/MOSITURE-METER.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    39,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31340,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"39","sale_price":""}'::jsonb
  ),
  (
    'microbe-clean-basic-understanding-course-ccw',
    'Microbe Clean Basic Understanding Course - CCW',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/microbe-clean-basic-understanding/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Virus Facts</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Bacteria and Modes of Transmission</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hygiene Practices</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning and Disinfecting for Health</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning Types and Touch Points</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cross Contamination</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Personal Protective Equipment PPE</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Donning and Doffing PPE</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Heat Exhaustion and Heat Stroke</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazard Identification</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Risk Assessments</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hierarchy of Controls</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Documentation and Reporting</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Standard Operating Procedures</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety Data Sheets</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Labelling</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Handling and Storage</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning Procedures</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Job Safety and Environmental Analysis</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safe Work Method Statements</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Signage and Precautions</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Spills</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Disposal</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Microbe Clean - Basic Understanding Quiz</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This Course offers a comprehensive knowledge of infection prevention and control. For cleaning businesses, it is essential to undergo infection cleaning training, covering topics such as: the spread of bacteria, proper cleaning and disinfecting methods for maintaining health, the use of personal protective equipment (PPE), recommended documentation, infection cleaning procedures, and other related aspects.
Course Duration:
Approximately 4.5 Hours
Continuing ',
    'https://carsi.com.au/wp-content/uploads/2021/02/MICROBE.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    99,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31336,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"99","sale_price":""}'::jsonb
  ),
  (
    'marketing-course-ccw',
    'Marketing Course - CCW',
    '<style>/*! elementor - v3.13.1 - 09-05-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Advertising</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Advertising Strategies</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Unique Selling Points</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Google Ad Words</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Social Media Posts</li>
</ul>
',
    'What can you expect from this Course?
As a small business owner sometimes, it can be overwhelming to try and manage everything yourself. You may lack the knowledge, skills, money, or time! If you have just started out, you may need a quick and easy run down of HOW to market your cleaning business and bring in more clients. Sign up today!
Course Duration:
Approximately 45 Minutes
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 1 Hour
Once complet',
    'https://carsi.com.au/wp-content/uploads/2021/10/MARKETING.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    99,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31332,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"99","sale_price":""}'::jsonb
  ),
  (
    'level-3-mould-remediation-ccw',
    'Level 3 - Mould Remediation - CCW',
    '<style>/*! elementor - v3.13.1 - 09-05-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/level-3-mould-remediation/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Introduction to Mould</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Level 3 Preparation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">The Framework of Health and Safety Regulations</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazards and Risks</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Risk Assessment</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Level 3 Mould Personal Protective Equipment</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Heat Exhaustion and Heat Stroke</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Level 3 Chemicals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Storing Chemicals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Level 3 Labelling</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Bacteria and Modes of Transmission</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Waste Types</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety Data Sheets</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Level 3 Moisture Meters</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Relative Humidity</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Building Materials</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Factors to consider for Moisture Meters</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Level 3 Initial Inspection</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Level 3 Containment</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Full Scale Containment</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Job Safety and Environmental Analysis</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safe Work Method Statements</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Other Documentation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Plant and Machinery</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Standard Operating Procedures</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Emergency Situations</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Emergency Documentation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Understanding Antimicrobials</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Completing Mould Remediation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Content Remediation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Finalising Mould Remediation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Level 3 Waste</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Level 3 Transferring Waste</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazardous Waste</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Disposing Chemicals and E Waste</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning Equipment and PPE</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide a more extensive and final look at Mould remediation following on from levels 1 and 2.
Course Duration:
Approximately 4.5 Hours
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 5 Hours
Once completed please email support@carsi.com.au for your Certificate of completion confirming your hours of Continuing Education Credits.


The IICRC does not endorse any educational provider, produ',
    'https://carsi.com.au/wp-content/uploads/2021/05/LEVEL-3-MOULD.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    149,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31328,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"149","sale_price":""}'::jsonb
  ),
  (
    'level-2-mould-remediation-ccw',
    'Level 2 - Mould Remediation - CCW',
    '<style>/*! elementor - v3.13.1 - 09-05-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/level-2-mould-remediation/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Introduction to Mould</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Preparation for Mould Remediation - Level 2</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">The Framework of Health and Safety Regulations</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazards, Risks, and Control Measures</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Heat Exhaustion and Heat Stroke</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning Chemicals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Biological Hazards</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety Data Sheets</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Moisture Meters</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Initial Inspection - Level 2</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Containment</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Job Safety and Environmental Analysis</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Documentation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Plant and Machinery</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Emergency Situations</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Emergency Documentation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Mould Remediation Processes</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Disposal Mould Course</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Removing Waste</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Finalise Tasks</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Upgrade to Level 3 - Mould Remediation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Quiz</li>
</ul>
',
    'What can you expect from this Course?
This course will follow on from Level 1 and provide a further look at Mould remediation, providing extended skills for your business requirements.
Course Duration:
Approximately 3.5 Hours
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 4 Hours
Once completed please email support@carsi.com.au for your Certificate of completion confirming your hours of Continuing Education Credits.


The IICRC does not endorse',
    'https://carsi.com.au/wp-content/uploads/2021/05/LEVEL-2-MOUD.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    49,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31324,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"49","sale_price":""}'::jsonb
  ),
  (
    'level-1-mould-remediation-ccw',
    'Level 1 Mould Remediation - CCW',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/level-1-mould-remediation/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Introduction to Mould</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Preparation for Mould Remediation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety Data Sheets</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Initial Inspection</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Mould Remediation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Waste and Disposal</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Upgrade to Level 2</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Level 1 Mould Remediation Certificate Quiz</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide participants with the foundation knowledge and skills required to understand the hazard of Mould and the impact it can cause to health. Understand the different types of Mould and environments in which it grows, and how to protect yourself with the use of personal protective equipment. You will be provided with the basic principles for cleaning and remediation to be able to combat Mould and its source.
Course Duration:
Approximate',
    'https://carsi.com.au/wp-content/uploads/2021/08/LEVEL-1-MOULD.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    49,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31318,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"49","sale_price":""}'::jsonb
  ),
  (
    'job-safety-and-environmental-analysis-jsea-course-ccw',
    'Job Safety and Environmental Analysis (JSEA) Course - CCW',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/job-safety-and-environmental-analysis-jsea-course/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Job Safety and Environmental Analysis (JSEA)</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Professional Carpet Cleaners and Restorers Podcast</li>
</ul>
',
    'What can you expect from this Course?
Learn the importance of job safety and how to manage risk, with this Job safety and environmental analysis course. Make sure tasks are carried out safely with learning about the JSEA document. Also enjoy the Professional Carpet Cleaners and Restorers podcast included at the end!
Course Duration:
Approximately 1 Hour
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 1 Hour
Once completed please email support@ca',
    'https://carsi.com.au/wp-content/uploads/2022/03/JOB-SAFETY.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    20,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31314,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":59,"name":"Free Courses | Start Learning Restoration with CARSI","slug":"free-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"20","sale_price":""}'::jsonb
  ),
  (
    'water-extraction-ccw',
    'Introduction to Water Extraction Methods - CCW',
    '<style>/*! elementor - v3.18.0 - 06-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-water-extraction-methods/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Purpose of Extraction</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Extraction Equipment</li>
<li>Extraction Techniques</li>
<li>Waste Disposal</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course offers a concise yet comprehensive understanding of water extraction for effective restoration.
Participants learn to promptly remove water, minimising secondary damage and initiating the drying process. Safety considerations, equipment exploration, extraction techniques, waste disposal practices, and regulatory compliance are covered to ensure participants gain essential skills for efficient and safe restoration processes.
Course Duration:
Appro',
    'https://carsi.com.au/wp-content/uploads/2023/12/water-extraction-1-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":31309,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'introduction-to-water-damage-restoration-course-ccw',
    'Introduction to Water Damage Restoration - CCW',
    '<style>/*! elementor - v3.18.0 - 06-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-water-damage-restoration/lessons/introduction-to-water-damage-restoration/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Health and Safety</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Inspecting Water Damage</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Controlling Moisture Sources</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Water Extraction Methods</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Drying Equipment and Set Up</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course covers foundational aspects of water damage restoration, including health and safety practices, the use of Personal Protective Equipment (PPE), and safety hazards at water damage sites.
Participants learn to inspect and categorise water damage, control moisture sources, and use drying equipment.
The curriculum also includes cleaning and deodorising techniques, concluding with participants gaining essential knowledge and practical skills for succe',
    'https://carsi.com.au/wp-content/uploads/2023/12/water-damage-restoration-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":31305,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'water-damage-ccw',
    'Introduction to Water Damage Principles - CCW',
    '<style>/*! elementor - v3.18.0 - 08-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-water-damage-principles/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety and Health</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Remediation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Psychrometrics</li>
<li>Microbial Concerns</li>
<li>Damage Assessment</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course offers a comprehensive overview of occupational safety and health practices in the United States and Australia. Covering OSHA training, PPE needs, and hazard identification, it emphasizes worker safety, occupant health, and Australian safety standards.
The curriculum includes insights into the remediation process, encompassing water extraction, drying techniques, and ongoing evaluation. Key components such as psychrometrics, microbial concerns, a',
    'https://carsi.com.au/wp-content/uploads/2024/07/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-5-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":31301,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":4007,"name":"Mould","slug":"mould"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'water-damage-marketing-ccw',
    'Introduction to Water Damage Marketing and Sales - CCW',
    '<style>/*! elementor - v3.21.0 - 26-05-2024 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-water-damage-marketing-and-sales/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Lead Generation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Consultative Sales Approach</li>
<li>Customer Service</li>
<li>Expanding Market Share</li>
<li>Relevant Certifications</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
From this course, you can expect to learn about effective marketing and sales strategies for water damage restoration services. The curriculum covers lead generation through online listings, radio advertising, direct mailers, and industry partnerships. You&#8217;ll gain insights into a consultative sales approach, including loss assessment, documented recommendations, scope review, and objection handling. The course emphasizes customer service, focusing on e',
    'https://carsi.com.au/wp-content/uploads/2024/05/Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-2-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '["team"]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":31297,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'water-damage-commercial-ccw',
    'Introduction to Water Damage in Commercial Buildings - CCW',
    '<style>/*! elementor - v3.18.0 - 20-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-water-damage-in-commercial-buildings/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Common Causes</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Major System Vulnerabilities</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Loss Impacts</li>
<li>Drying Considerations</li>
<li>Reconstruction Factors</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course provides a thorough overview of managing commercial water disasters, covering causes, vulnerabilities, and impacts.
Topics include drying considerations, reconstruction factors, and practical strategies for prevention and recovery.
The course concludes with essential insights into effective disaster management practices for commercial settings.

 
Course Duration:
Approximately 30 minutes
Continuing Education Credit:
This course is approved for I',
    'https://carsi.com.au/wp-content/uploads/2023/12/water-damage-commercial-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":31293,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4007,"name":"Mould","slug":"mould"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'water-damage-estimating-ccw',
    'Introduction to Water Damage Estimating - CCW',
    '<style>/*! elementor - v3.18.0 - 20-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-water-damage-estimating/lessons/introduction-to-water-damage-estimating/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Assessment</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Scope Development</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Quantification</li>
<li>Insurance Estimating</li>
<li>Bid Analysis</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?

This course aims to provide a comprehensive understanding of water damage assessment, covering categorization, damage documentation, identification of affected materials, and loss timeline considerations. Scope development encompasses drying, remediation, structural repairs, and contents manipulation, with quantification involving measurements, unit costs, overhead factors, and equipment/labor tally.
The course also delves into insurance estimating, bid ana',
    'https://carsi.com.au/wp-content/uploads/2023/12/water-damage-estimating-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":31289,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'using-ppe-ccw',
    'Introduction to Using Personal Protective Equipment - CWW',
    '<style>/*! elementor - v3.18.0 - 06-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/using-personal-protective-equipment/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Respiratory Protection</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Eye and Face Protection</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Head Protection</li>
<li>Hearing Protection</li>
<li>Body Protection</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course offers a comprehensive introduction to the proper use of Personal Protective Equipment (PPE) in diverse workplaces.
Participants will learn about respiratory, eye, face, head, and hearing protection, including details on sizing, fit testing, inspection, and maintenance.
The course also covers body protection, addressing materials, designs, care, and high-visibility apparel for overall workplace safety.
Course Duration:
Approximately 30 minutes
Co',
    'https://carsi.com.au/wp-content/uploads/2023/12/ppe.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31285,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'upholstery-ccw',
    'Introduction to Upholstery Cleaning and Drying - CCW',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-upholstery-cleaning-and-drying/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Upholstery Fabrics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Water Damage Effects</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning Methods</li>
<li>Drying Considerations</li>
<li>Health Concerns</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to equip participants with essential knowledge and skills for upholstery cleaning and drying. Covering topics such as upholstery fabrics, water damage effects, cleaning methods, drying considerations, and health concerns, participants will learn how to effectively remove contaminants and moisture while preserving upholstery integrity. Through comprehensive instruction, participants will gain insights into selecting appropriate cleaning techn',
    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-drying-techniques.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":31281,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'structural-drying-ccw-2',
    'Introduction to Structural Drying Concepts - CCW',
    '<style>/*! elementor - v3.18.0 - 06-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-structural-drying-concepts/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Building Science</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Drying Dynamics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Monitoring Structural Drying</li>
<li>Drying Systems</li>
<li>Restorative Drying Standards</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course provides a comprehensive understanding of building science principles in the context of restoration.
Participants explore key areas, including controlled heat application for efficient evaporation, airflow management, psychrometrics, and drying dynamics. The module on monitoring structural drying emphasises measurable benchmarks, equipment considerations, and safety. The course concludes with a focus on restorative drying standards, incorporating',
    'https://carsi.com.au/wp-content/uploads/2023/12/structural-drying-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":31277,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'social-media-marketing-ccw',
    'Introduction to Social Media Marketing - CCW',
    '<style>/*! elementor - v3.19.0 - 07-02-2024 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-facebook-marketing/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">How, What and Whys</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Setting Up Your Facebook Presence</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Facebook Ad Types</li>
<li>Targeting Your Facebook Audience</li>
<li>Structuring Your Facebook Ad Campaigns</li>
<li>Bidding and Budgeting</li>
<li>Analysing Performance and Optimisation</li>
<li>Advanced Facebook Tools and Features</li>
<li>Additional Social Media Platforms to Consider for Advertising</li>
<li>Additions</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?

 This course covers Facebook marketing essentials for small businesses. Starting with goal setting and creating a Facebook presence, it moves on to ad types, audience targeting, campaign structuring, bidding, and budgeting. Participants learn to analyze performance, optimize ads, and utilize advanced Facebook tools. Additionally, it explores advertising on other platforms like Instagram and TikTok for an omni-channel approach.
 
Course Duration:
3 to 4 Hour',
    'https://carsi.com.au/wp-content/uploads/2024/02/social-media-marketing-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31273,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":62,"name":"Membership","slug":"membership"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'smokeandsoot-ccw',
    'Introduction to Smoke and Soot Damage Restoration - CCW',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-smoke-and-soot-damage-restoration/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Fire Dynamics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Assessment</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Smoke Particulates</li>
<li>Cleaning Challenges</li>
<li>Odour Control Methods</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
Introduction to Smoke and Soot Damage Restoration provides essential knowledge and skills for addressing fire-related damage. Participants learn fire dynamics, assessing damage, smoke particulates characteristics, cleaning challenges, and odor control methods. Topics include combustion factors, deposition behaviors, and distinguishing old/new damage. The course covers dry soot aggregates, oily residues, toxic vapors, and cleaning challenges. Participants exp',
    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-drying-techniques.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31268,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'safety-procedures-ccw',
    'Introduction to Safety Procedures for Water Damage Work - CCW',
    '<style>/*! elementor - v3.18.0 - 06-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/safety-procedures/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Assessing Hazards</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Use of PPE</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Exposure Controll</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Equipment Safety</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course offers a basic understanding of safety procedures in water damage work, focusing on hazard assessment, proper use of personal protective equipment (PPE), and exposure control measures. Participants learn to address physical hazards, chemical dangers like mold and sewage, and environmental risks such as noise and temperature extremes.
Practical training covers the use of respiratory, dermal, ocular, and hearing protection, along with exposure cont',
    'https://carsi.com.au/wp-content/uploads/2023/12/water-damage.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":31264,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'science-ccw',
    'Introduction to Psychrometry Science and Calculations - CCW',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-psychrometry-science-and-calculations/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Psychrometrics Charts</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Psychrometrics Calculations</li>
<li>Instrumentation</li>
<li>Applying Psychrometrics</li>
<li>Atmospheric Impacts</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course offers a concise overview of psychrometry, covering charts, calculations, instrumentation, applications, and atmospheric impacts. Students learn to interpret psychrometric data, perform calculations, and utilize instruments like psychrometers and data loggers. Practical applications include equipment selection, drying rate analysis, and considering atmospheric conditions for effective moisture management.
 
Course Duration:
Approx 30 Minutes
CEC ',
    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31260,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'psychrometry-drying-ccw',
    'Introduction to Psychrometry and the Drying Process - CCW',
    '<style>/*! elementor - v3.18.0 - 20-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/psychrometry-and-the-drying-process/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Psychrometric Chart</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Applying Psychrometrics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Phases of Drying</li>
<li>Calculating Drying Rates</li>
<li>Impact on Restoration</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course offers a comprehensive understanding of psychrometrics and its practical application in restoration.
Participants learn to set drying goals, monitor conditions, and specify equipment using the psychrometric chart. The curriculum covers drying phases, rate calculations, and industry benchmarks.
Insights into the impact of psychrometrics on preventing secondary damage, ensuring structural stability, defining remediation scope, and guiding reconstru',
    'https://carsi.com.au/wp-content/uploads/2023/12/PSYCHROMETRY-.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":31255,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'water-losses-ccw',
    'Introduction to Project Management for Water Losses - CCW',
    '<style>/*! elementor - v3.20.0 - 26-03-2024 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-project-management-for-water-losses/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Initial Response</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Planning</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Execution</li>
<li>Closeout</li>
<li>Risk Management</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide a comprehensive overview of water loss project management, covering key steps from initial response to risk management. It emphasizes planning, coordination, and proactive risk mitigation for successful restoration projects.

 
Course Duration:
Approx 30 Minutes
CEC Credits
1 Hour

 
The IICRC does not endorse any educational provider, product, offering, 
or service. The Institute expressly disclaims responsibility, 
endorsement o',
    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-Copy-of-drying-techniques-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '["team"]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":31251,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'porous-drying-ccw',
    'Introduction to Porous Materials Drying - CCW',
    '<style>/*! elementor - v3.18.0 - 20-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-porous-materials-drying/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Porosity and Moisture</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Porous Materials in Buildings</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Drying Challenges</li>
<li>Drying Methods</li>
<li>Indicating Dryness</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide a comprehensive understanding of porosity and moisture in diverse materials, focusing on their impact on building components.
It covers porosity definition, moisture absorption, sorption dynamics, and monitoring techniques. The course explores challenges in drying porous materials such as trapped moisture, wicking effects, and complex geometries. Different drying methods, including air circulation, desiccant drying, and low grain ',
    'https://carsi.com.au/wp-content/uploads/2023/12/porous-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":31245,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'odour-control-ccw',
    'Introduction to Odour Control and Removal Techniques - CCW',
    '<style>/*! elementor - v3.18.0 - 06-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-odour-control-and-removal-techniques/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Odour Basics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Containment Strategies</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Air Purification Methods</li>
<li>Odour Counteractants</li>
<li>Surface Treatments</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course provides a comprehensive understanding of odour control and removal techniques. Beginning with fundamentals like odour causes and health effects, it explores containment strategies, air purification methods, and odor counteractants.
The curriculum covers surface treatments such as cleaning, sealants, and fogging to eliminate embedded smells. Real-life examples illustrate the practical application of these techniques, ensuring participants gain in',
    'https://carsi.com.au/wp-content/uploads/2023/12/odour-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'OCT',
    NULL,
    '{"wp_id":31241,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'mould-identification-ccw',
    'Introduction to Mould Identification and Remediation - CCW',
    '<style>/*! elementor - v3.18.0 - 06-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-mould-identification-and-remediation/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Mould Basics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Identification</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Personal Protective Equipment</li>
<li>Remediation</li>
<li>Post Remediation</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course provides a basic understanding of mould identification and remediation. It covers mould basics, identification methods, and remediation procedures, emphasising the use of Personal Protective Equipment (PPE). Participants gain the knowledge and skills for safe and effective mould remediation, promoting occupant health and preventing recurrence.
Course Duration:
Approximately 30 minutes
Continuing Education Credit:
This course is approved for IICRC',
    'https://carsi.com.au/wp-content/uploads/2023/12/mould-identification.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31235,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'largelossdrying-ccw',
    'Introduction to Large Loss Drying Projects - CCW',
    '<style>/*! elementor - v3.21.0 - 26-05-2024 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-large-loss-drying-projects/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Project Management</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Loss Containment</li>
<li>Conditioned Space Management</li>
<li>Scheduling Phases</li>
<li>Verification Evidence</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide a comprehensive overview of managing large-scale drying projects.
It covers stakeholder coordination, resource logistics, reassessments, and change orders. Emphasis is placed on loss containment, conditioned space management, and phased scheduling while ensuring rigorous verification through testing, inspections, and detailed forensic engineering reports to meet restoration and safety standards.

 
 
Course Duration:
Approx 30 Min',
    'https://carsi.com.au/wp-content/uploads/2024/06/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-2-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":31231,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'hvacsystems-ccw',
    'Introduction to HVAC Systems and Drying Strategies - CCW',
    '<style>/*! elementor - v3.21.0 - 15-04-2024 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-hvac-systems-and-drying-strategies/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">HVAC Components</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Water Damage Impacts</li>
<li>Drying Considerations</li>
<li>Restorative Cleaning</li>
<li>Reconstructive Requirements</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide a comprehensive understanding of HVAC systems and drying strategies. It covers HVAC components such as ductwork, heat exchangers, air handling equipment, and terminal equipment. Additionally, it explores the impacts of water damage on HVAC systems, drying considerations, restorative cleaning techniques, reconstructive requirements, and maintenance strategies to ensure optimal system performance and indoor air quality.
 
Course Dur',
    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":31227,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'forensic-ccw',
    'Introduction to Forensic Investigations for Water Losses - CCW',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-forensic-investigations-for-water-losses/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Reasons for Investigations</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Methods</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Failure Analysis</li>
<li>Presenting Findings</li>
<li>Establishing Cost of Loss</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to offer a thorough understanding of forensic investigations for water losses, covering reasons for investigations, methods used, failure analysis, presenting findings, and establishing the cost of loss.
Topics include resolving claim disputes, equipment malfunctions, alleged negligence, and change order justification.
Methods range from directed inspections to moisture mapping and microbial colonization observation.
Presenting findings invo',
    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '["team"]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":31223,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'drying-techniques-ccw',
    'Introduction to Drying Techniques and Equipment - CCW',
    '<style>/*! elementor - v3.18.0 - 06-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/drying-techniques-and-equipment/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Moisture Basics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Drying Science</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Drying Equipment</li>
<li>Structural Drying</li>
<li>Restoring Contents</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course provides a concise yet comprehensive overview of moisture dynamics, drying science, and restoration techniques.
Participants learn key elements such as evaporation, psychrometrics, and specialised equipment use. The training covers drying considerations for different materials and areas, as well as content restoration methods.
By the course end, participants acquire essential knowledge and skills for effective moisture management and restoration ',
    'https://carsi.com.au/wp-content/uploads/2023/12/drying-techniques-2.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":31217,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'difficult-materials-ccw',
    'Introduction to Drying Difficult Materials - CCW',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-drying-difficult-materials/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Dense Materials</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Composite Assemblies</li>
<li>Irregular Geometries</li>
<li>Delicate Contents</li>
<li>Diffusion Dynamics</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide an in-depth understanding of drying techniques for difficult materials.
It covers drying strategies for dense materials like concrete and plaster, composite assemblies such as insulated walls and carpeted floors, and irregular geometries including sculptures and musical instruments. Additionally, the course addresses the diffusion dynamics of moisture migration and evaporation rates, ensuring proper restoration and preservation pr',
    'https://carsi.com.au/wp-content/uploads/2024/06/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-1-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":31213,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'moisture-mapping-ccw',
    'Introduction to Digital Moisture Mapping - CCW',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-digital-moisture-mapping/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Moisture Data Collection</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Data Management Software</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Moisture Distribution Analysis</li>
<li>Report Generation</li>
<li>Process Optimisation</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide a comprehensive understanding of digital moisture mapping techniques for water damage restoration. Participants will learn about accurate data collection methods, management software, and analysis techniques. Through the course, they&#8217;ll gain skills in optimizing drying processes, generating comprehensive reports, and supporting insurance claims.

 
Course Duration:
Approx 30 Minutes
CEC Credits
1 Hour

 
The IICRC does not e',
    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-Copy-of-drying-techniques.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31209,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'dryingprotocol-ccw',
    'Introduction to Developing a Drying Protocol - CCW',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-developing-a-drying-protocol/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Loss Assessment</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Scope Development</li>
<li>Equipment Selection</li>
<li>Execution Planning</li>
<li>Verification Strategy</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide a comprehensive methodology for assessing and addressing water damage in structures. It covers loss assessment through documenting and mapping moisture, testing for microbial growth, and performing psychrometric analysis.
Scope development includes detailing affected materials and setting SMART goals.
Equipment selection involves calculating airflow needs and optimal positioning, while execution planning focuses on monitoring prog',
    'https://carsi.com.au/wp-content/uploads/2024/06/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-2.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '["team"]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":31205,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'controlled-drying-ccw',
    'Introduction to Controlled Environment Drying Methods - CCW',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-controlled-environment-drying-methods/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Containment Systems</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Airflow Control</li>
<li>Energy Control</li>
<li>Monitoring Platforms</li>
<li>Special Considerations</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
From this course, you can expect to learn about advanced controlled environment drying methods, encompassing containment systems, airflow, and energy control, as well as monitoring platforms and special considerations for building and material safety. You&#8217;ll explore the use of barriers, airlocks, and pressure management to isolate work zones, along with airflow devices and filtration systems to optimize drying processes. The course also covers thermal ',
    'https://carsi.com.au/wp-content/uploads/2024/05/Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-3.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":31201,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'complex-water-losses-ccw',
    'Introduction to Consulting for Complex Water Losses - CCW',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-consulting-for-complex-water-losses/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Loss Assessment</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Strategic Drying Plans</li>
<li>Specifying Resources</li>
<li>Coordinating Trades</li>
<li>Developing Documentation</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide comprehensive training in assessing and managing complex water loss incidents. It covers loss assessment, strategic drying plans, resource specification, trade coordination, and documentation development.
Participants will learn to evaluate damage, plan constraints, conduct psychrometric analysis, schedule phased drying, balance equipment loads, source specialized equipment, and ensure precise documentation for compliance and audi',
    'https://carsi.com.au/wp-content/uploads/2024/06/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":31197,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'biologicalcontaminants-ccw',
    'Introduction to Biological Contaminants and Treatments - CCW',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-biological-contaminants-and-treatments/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Contamination Sources</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Assessment Diagnostics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Remediation Strategies</li>
<li>Safety Controls</li>
<li>Clearance Verification</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide an understanding of biological contaminants and their treatments.
It covers contamination sources such as sewage backflows, flooded landscapes, rodent infestations, and microbial reservoir materials.
Assessment diagnostics include ATP testing, Petri dish analysis, bulk/air sampling, and laboratory quantification, leading to remediation strategies like physical removal, chemical disinfection, and electrochemical treatments. Safety ',
    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-Copy-of-drying-techniques-2.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31193,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'carpet-cleaning-ccw',
    'Introduction to Basic Carpet Cleaning and Drying - CCW',
    '<style>/*! elementor - v3.18.0 - 06-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-basic-carpet-cleaning-and-drying/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Carpet Construction</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Water Damage Effects</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning Equipment</li>
<li>Cleaning Products</li>
<li>Drying Techniques</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course covers comprehensive insights into carpet construction, water damage effects, cleaning equipment, and drying techniques.
Participants learn about various carpet fibers, their characteristics, and how they impact cleaning decisions. The curriculum also addresses water damage effects and equips learners with practical skills in using equipment and cleaning agents for efficient carpet restoration.
The course emphasises the importance of water extrac',
    'https://carsi.com.au/wp-content/uploads/2023/12/basic-carpet-cleaning.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'CCT',
    NULL,
    '{"wp_id":31189,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'structural-drying-ccw',
    'Introduction to Applied Structural Drying - CCW',
    '<style>/*! elementor - v3.18.0 - 08-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-applied-structural-drying/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Building Components</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Drying Dynamics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Drying Equipment</li>
<li>Drying Techniques</li>
<li>Monitoring and Documenting</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide a basic yet comprehensive exploration of moisture management and structural drying techniques.
Participants will delve into assessing water infiltration in foundational elements, evaluating moisture pathways in various building systems, and addressing the effects of water damage. The curriculum covers essential drying dynamics, equipment usage, and techniques such as evaporative drying, controlled environment drying, desiccant dry',
    'https://carsi.com.au/wp-content/uploads/2023/12/applied-structural-drying-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":31185,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4007,"name":"Mould","slug":"mould"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'applied-microbial-ccw',
    'Introduction to Applied Microbial Remediation - CCW',
    '<style>/*! elementor - v3.20.0 - 10-04-2024 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-applied-microbial-remediation/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Microbial Amplification</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Remediation Planning</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Execution</li>
<li>Verification</li>
<li>Contractor Standards</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course provides a thorough overview of Applied Microbial Remediation, covering Microbial Amplification, Remediation Planning, Execution, Verification, and Contractor Standards. Topics include mold growth conditions, health effects, containment setup, equipment selection, post-remediation inspection, and licensing requirements, ensuring comprehensive training in industry best practices.
 
Course Duration:
Approx 30 Minutes
CEC Credits
1 Hour

 
The IICRC',
    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-drying-techniques-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31181,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'advancedstructural-ccw',
    'Introduction to Advanced Structural Drying Concepts - CCW',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-advanced-structural-drying-concepts/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Building Science</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Controlled Drying Methods</li>
<li>Verification</li>
<li>Large Loss Drying </li>
<li>Specialised Drying Knowledge</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide comprehensive understanding and practical skills in building science, controlled drying methods, verification techniques, large loss drying strategies, and specialized drying knowledge.
From mastering heat transfer principles to implementing specialized drying techniques for unique materials, students will learn to navigate airflow dynamics, psychrometric interactions, and factors influencing drying.
Emphasis is placed on validati',
    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":31176,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'introduction-to-advanced-drying-equipment-and-methods-ccw',
    'Introduction to Advanced Drying Equipment and Methods - CCW',
    '<style>/*! elementor - v3.19.0 - 29-01-2024 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-advanced-drying-equipment-and-methods/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Desiccant Systems</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Mechanical Drying Elements</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Air Treatment Technologies</li>
<li>Monitoring Equipment</li>
<li>Software Tools.</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to explore Advanced Drying Equipment and Methods comprehensively.
Participants will learn about desiccant systems, mechanical drying elements, air treatment technologies, monitoring equipment, and software tools. Topics include crystal towers, dense air drying, vacuum freeze drying, air scrubbers, humidity sensors, psychrometric calculators, and more. The course emphasizes practical applications, specialized considerations, and efficient lar',
    'https://carsi.com.au/wp-content/uploads/2023/12/advanced-drying-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":31168,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'initial-inspection-report-course-ccw',
    'Initial Inspection Report Course - CCW',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/initial-inspection-report/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Initial Inspection Report Walk Through</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Initial Inspection Report Download</li>
</ul>
',
    'What can you expect from this Course?
This course provides participants with an understanding of HOW to complete an initial inspection report. There is a FREE template available to download at the end of the course. This course is available for FREE as part of our Foundation and Growth Membership packages.
Course Duration:
Approximately 40 Minutes
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 1 Hour
Once completed please email support@carsi.co',
    'https://carsi.com.au/wp-content/uploads/2021/10/INSPECTION.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    49,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31164,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"49","sale_price":""}'::jsonb
  ),
  (
    'infectious-control-for-the-business-owner-ccw',
    'Infectious Control for the Business Owner - CCW',
    '<style>/*! elementor - v3.13.1 - 09-05-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/infectious-control-for-the-business-owner/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Virus Facts</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Bacteria and Modes of Transmission</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning and Disinfecting for Health</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hygiene Practices</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Understanding Risks</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning Types and Touch Points</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cross Contamination</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Insurance and Liability</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Before the Job</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazard Identification</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Risk Assessments</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hierarchy of Controls</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety Data Sheets</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Labelling</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Standard Operating Procedures</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Job Safety and Environmental Analysis (JSEA)</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safe Work Method Statements (SWMS)</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">ATP Terminology</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hygiene Monitoring</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">ATP and Protocols</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Testing Protocols</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Examples</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Handling and Storage</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Chemicals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazardous Chemicals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Tools</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Application</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Microfiber Cloths</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Personal Protective Equipment PPE</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Donning and Doffing PPE</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Heat Exhaustion and Heat Stroke</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Disposal</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Quiz</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
Cleaners are essential workers and require increased training and knowledge in health cleaning. However, before you endeavor down the infectious control cleaning path, you need to ensure you and your business are prepared.
Study any time, anywhere, any pace, with Australia’s only CFO (Certified Forensic Operator) and CBFRS (Certified Bio-Forensic Restoration Specialist) Phillip McGurk, this course has been developed to educate cleaning companies of their req',
    'https://carsi.com.au/wp-content/uploads/2021/02/BUSINESS-OWNER.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    275,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31160,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"275","sale_price":""}'::jsonb
  ),
  (
    'infection-control-in-child-care-ccw',
    'Infection Control in Child Care - CCW',
    '<style>/*! elementor - v3.13.1 - 09-05-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/infection-control-in-child-care/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Virus Facts</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Bacteria and Modes of Transmission</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning and Disinfecting for Health</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cross Contamination</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hygiene Practices</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">When to Wash Hands</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Alcohol Based Hand Rub</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Gloves</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning Types and Touch Points</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safe and Effective Disinfecting</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Using Products Safely</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety Data Sheets</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Labelling</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Microfiber Cloths</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Soft Surfaces</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Electronics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Laundry</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Outdoor Areas</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Toys</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Nappy Changes</li>
<li>Food Preparation and Handling</li>
<li>Washing, Feeding and Holding Children</li>
<li>Quiz</li>
</ul>
',
    'What can you expect from this Course?
Child Care Centres are receiving a lot of questions from parents in regard to providing a safe environment for the children they care for and require increased training and knowledge in health cleaning. It is now more important than ever that you realise the enormous responsibility and reliance on your skills and knowledge.
Study any time, anywhere, any pace, with Australia’s only CFO (Certified Forensic Operator) and CBFRS (Certified Bio-Forensic Restoratio',
    'https://carsi.com.au/wp-content/uploads/2021/02/CHILD-CARE.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    99,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31156,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"99","sale_price":""}'::jsonb
  ),
  (
    'glass-cleaning-course-ccw',
    'Glass Cleaning Course - CCW',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/glass-cleaning-course"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Plan and Prepare</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Clean the Glass</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Glass Cleaning Video</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">BONUS: Window Tracks</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Glass Cleaning Quiz</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This Glass Cleaning Course covers the cleaning of glass surfaces, including windows. This course can assist employers with training requirements under the WHS legislation. It is an entry level window cleaning course that covers the fundamentals of glass cleaning. Learn what equipment and products you will need to start cleaning class.
Course Duration:
Approximately 30 Minutes
Continuing Education Credit:
This course is approved for IICRC Continuing Education',
    'https://carsi.com.au/wp-content/uploads/2022/05/GLASS-CLEANING.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    20,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31152,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"20","sale_price":""}'::jsonb
  ),
  (
    'donning-and-doffing-ppe-ccw',
    'Donning and Doffing PPE - CCW',
    '<style>/*! elementor - v3.17.0 - 01-11-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="/courses/donning-and-doffing-ppe/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Personal Protective Equipment PPE</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Donning and Doffing PPE</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Heat Exhaustion and Heat Stroke</li>
</ul>
',
    'What can you expect with this Course?
This course aims to provide the understanding on PPE and its purpose. Learning how to use it correctly to protect yourself and those around you, including correct ways of disposal and how to be aware of the dangers of heat when wearing the equipment.
Course Duration:
Approximately 40 Minutes
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 1 Hour
Once completed please email support@carsi.com.au for your Certi',
    'https://carsi.com.au/wp-content/uploads/2021/03/DONNING-AND-DOFFING-1-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    39,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31148,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"39","sale_price":""}'::jsonb
  ),
  (
    'carpet-cleaning-basics-ccw',
    'Carpet Cleaning Basics - CCW',
    '<style>/*! elementor - v3.13.1 - 09-05-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/carpet-cleaning-basics/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Introduction to Carpet Cleaning</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Basic Cleaning Chemistry</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Textile Flooring and Carpet Cleaning</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaners</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazardous Chemicals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Managing Risks for Hazardous Chemicals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety Data Sheets</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Labelling</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Fiber Identification</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Pre Cleaning Observation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Fiber Characteristics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Equipment and Methods</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Standard Operation Procedures</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Basic Stain Removal Understanding</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Disposal</li>
</ul>
',
    'What can you expect from this course?
This course explains how to safely and professionally clean flooring and carpets, while learning how chemicals and the environment can be effective, to be able to restore them to their former glory.
Course Duration:
Approximately 2.5 Hours
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 3 Hours
Once completed please email support@carsi.com.au for your Certificate of completion confirming your hours of Contin',
    'https://carsi.com.au/wp-content/uploads/2021/02/CARPET-CLEANING-2.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    55,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '["team"]'::jsonb,
    'CCT',
    NULL,
    '{"wp_id":31144,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"55","sale_price":""}'::jsonb
  ),
  (
    'asthmaallergy-ccw',
    'Asthma and Allergy Course - CCW x CARSI',
    '<style>/*! elementor - v3.13.1 - 09-05-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/asthma-and-allergy-course/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Asthma and Allergies</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Asthma and Allergy Facts</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">The Relationship Between Allergic Diseases</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Dust Mite Allergies</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Pet Allergies</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Control and Prevention</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Environmental Control</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Anti Allergen Technology</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">How it Works</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Handling and Storage</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety Data Sheets</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Labelling</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Personal Protective Equipment PPE</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Donning and Doffing PPE</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Heat Exhaustion and Heat Stroke</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">The Anti Allergen Process</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Recommended Environmental Control Procedures</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Master Blend Product Range</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Disposal</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Documentation</li>
<li>Standard Operating Procedures</li>
<li>Marketing Opportunities</li>
<li>Unique Selling Points</li>
<li>Guarantees</li>
<li>Return on Investments</li>
</ul>
<p style="margin: 0in; font-family: Calibri; font-size: 13.5pt;">
',
    'What can you expect from this Course?
The professional cleaning industry is able to perform an important and valuable service for those suffering from asthma and allergies. Find out HOW with CARSI&#8217;s Asthma and Allergy Course!
Expand your business and services with an affordable new product out on the market!
Our CEO Phill McGurk has done extensive research and training for the MasterBlend ResponsibleCare Stystem.  If you are thinking of using or already are using the MasterBlend Responsibl',
    'https://carsi.com.au/wp-content/uploads/2021/02/ASTHMA-AND-ALLERGY.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    129,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31139,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"129","sale_price":""}'::jsonb
  ),
  (
    'admin-sole-trader-ccw',
    'Admin Course - Sole Trader - CCW x CARSI..',
    '<style>/*! elementor - v3.13.1 - 09-05-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; font-family: Calibri; font-size: 13.5pt;"><strong>Topics covered include:</strong></p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Customer Experience</li>
<li>Principles of Customer Experience</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Myer Briggs Personality Types</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Net Promoter Score</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Introduction to Marketing</li>
<li>Key Marketing Information</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Target Audiences</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Social Media Strategy</li>
<li>Smart Goals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Optimisation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Basic Analysis and Reporting</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Content Creation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Basic Invoicing and Accounting</li>
</ul>
',
    'What can you expect from this Course?
This course has been specifically designed for the sole trader of a cleaning company. Start your business with your best foot forward!
Course Duration:
Approximately 3.5 Hours
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 4 Hours
Once completed please email support@carsi.com.au for your Certificate of completion confirming your hours of Continuing Education Credits.


The IICRC does not endorse any educati',
    'https://carsi.com.au/wp-content/uploads/2021/06/admin.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    275,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '["team"]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":31135,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"275","sale_price":""}'::jsonb
  ),
  (
    'introduction-to-exterior-envelope-drying-strategies-ccw',
    'Introduction to Exterior Envelope Drying Strategies - CCW',
    '<style>/*! elementor - v3.21.0 - 26-05-2024 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-exterior-envelope-drying-strategies/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Barrier Materials</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Roof Assembly Considerations</li>
<li>Building Wrap Drying Dynamics</li>
<li>Wall System Drying</li>
<li>Foundation Drying Methods</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide comprehensive strategies for drying building exterior envelopes. It covers barrier materials, roof assembly considerations, building wrap dynamics, wall system drying, and foundation drying methods.
The course delves into evaluating and repairing water resistive barriers, managing roof permeability, ensuring effective drainage, optimizing airflow for moisture evacuation, and applying heat cautiously.
Additionally, it addresses pro',
    'https://carsi.com.au/wp-content/uploads/2024/06/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '["team"]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":31125,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"}],"wp_tags":[{"id":4846,"name":"team","slug":"team"}],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'exterior-envelope-drying',
    'Introduction to Exterior Envelope Drying Strategies',
    '<style>/*! elementor - v3.21.0 - 26-05-2024 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-exterior-envelope-drying-strategies/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Barrier Materials</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Roof Assembly Considerations</li>
<li>Building Wrap Drying Dynamics</li>
<li>Wall System Drying</li>
<li>Foundation Drying Methods</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide comprehensive strategies for drying building exterior envelopes. It covers barrier materials, roof assembly considerations, building wrap dynamics, wall system drying, and foundation drying methods.
The course delves into evaluating and repairing water resistive barriers, managing roof permeability, ensuring effective drainage, optimizing airflow for moisture evacuation, and applying heat cautiously.
Additionally, it addresses pro',
    'https://carsi.com.au/wp-content/uploads/2024/06/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":30973,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'complex-water-losses',
    'Introduction to Consulting for Complex Water Losses',
    '<style>/*! elementor - v3.21.0 - 26-05-2024 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-consulting-for-complex-water-losses/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Loss Assessment</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Strategic Drying Plans</li>
<li>Specifying Resources</li>
<li>Coordinating Trades</li>
<li>Developing Documentation</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide comprehensive training in assessing and managing complex water loss incidents. It covers loss assessment, strategic drying plans, resource specification, trade coordination, and documentation development.
Participants will learn to evaluate damage, plan constraints, conduct psychrometric analysis, schedule phased drying, balance equipment loads, source specialized equipment, and ensure precise documentation for compliance and audi',
    'https://carsi.com.au/wp-content/uploads/2024/06/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":30939,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'difficult-materials',
    'Introduction to Drying Difficult Materials',
    '<style>/*! elementor - v3.21.0 - 26-05-2024 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-drying-difficult-materials/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Dense Materials</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Composite Assemblies</li>
<li>Irregular Geometries</li>
<li>Delicate Contents</li>
<li>Diffusion Dynamics</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide an in-depth understanding of drying techniques for difficult materials.
It covers drying strategies for dense materials like concrete and plaster, composite assemblies such as insulated walls and carpeted floors, and irregular geometries including sculptures and musical instruments. Additionally, the course addresses the diffusion dynamics of moisture migration and evaporation rates, ensuring proper restoration and preservation pr',
    'https://carsi.com.au/wp-content/uploads/2024/06/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-1-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":30911,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'largelossdrying',
    'Introduction to Large Loss Drying Projects',
    '<style>/*! elementor - v3.21.0 - 26-05-2024 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-large-loss-drying-projects/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Project Management</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Loss Containment</li>
<li>Conditioned Space Management</li>
<li>Scheduling Phases</li>
<li>Verification Evidence</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide a comprehensive overview of managing large-scale drying projects.
It covers stakeholder coordination, resource logistics, reassessments, and change orders. Emphasis is placed on loss containment, conditioned space management, and phased scheduling while ensuring rigorous verification through testing, inspections, and detailed forensic engineering reports to meet restoration and safety standards.

 
 
Course Duration:
Approx 30 Min',
    'https://carsi.com.au/wp-content/uploads/2024/06/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-2-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":30834,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'dryingprotocol',
    'Introduction to Developing a Drying Protocol',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-developing-a-drying-protocol/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Loss Assessment</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Scope Development</li>
<li>Equipment Selection</li>
<li>Execution Planning</li>
<li>Verification Strategy</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide a comprehensive methodology for assessing and addressing water damage in structures. It covers loss assessment through documenting and mapping moisture, testing for microbial growth, and performing psychrometric analysis.
Scope development includes detailing affected materials and setting SMART goals.
Equipment selection involves calculating airflow needs and optimal positioning, while execution planning focuses on monitoring prog',
    'https://carsi.com.au/wp-content/uploads/2024/06/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-2.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":30825,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'water-damage-marketing',
    'Introduction to Water Damage Marketing and Sales',
    '<style>/*! elementor - v3.21.0 - 26-05-2024 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-water-damage-marketing-and-sales/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Lead Generation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Consultative Sales Approach</li>
<li>Customer Service</li>
<li>Expanding Market Share</li>
<li>Relevant Certifications</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
From this course, you can expect to learn about effective marketing and sales strategies for water damage restoration services. The curriculum covers lead generation through online listings, radio advertising, direct mailers, and industry partnerships. You&#8217;ll gain insights into a consultative sales approach, including loss assessment, documented recommendations, scope review, and objection handling. The course emphasizes customer service, focusing on e',
    'https://carsi.com.au/wp-content/uploads/2024/05/Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-2-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":30750,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'controlled-drying',
    'Introduction to Controlled Environment Drying Methods',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-controlled-environment-drying-methods/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Containment Systems</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Airflow Control</li>
<li>Energy Control</li>
<li>Monitoring Platforms</li>
<li>Special Considerations</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
From this course, you can expect to learn about advanced controlled environment drying methods, encompassing containment systems, airflow, and energy control, as well as monitoring platforms and special considerations for building and material safety. You&#8217;ll explore the use of barriers, airlocks, and pressure management to isolate work zones, along with airflow devices and filtration systems to optimize drying processes. The course also covers thermal ',
    'https://carsi.com.au/wp-content/uploads/2024/05/Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-3.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":30738,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'agi-smallbusiness',
    'AGI Essentials: A Practical Guide for Small Business Success',
    '<style>/*! elementor - v3.21.0 - 30-04-2024 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h1>Already Purchased This Course?</h1>
<p><a href="https://carsi.com.au/courses/agi-essentials-a-practical-guide-for-small-business-success/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Background and understanding of AGI</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Introduction to AGI</li>
<li>Understanding AI Basics</li>
<li>AGI Applications for Small Business</li>
<li>Implementing AGI in  Small Business</li>
<li>Case Studies and Success Stories</li>
<li>Future of AGI and Small Business</li>
<li>Conclusion and Next Steps</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide small business owners with a comprehensive understanding of Artificial General Intelligence (AGI) and its practical applications. Starting with an exploration of AGI fundamentals and its distinction from Narrow AI, the course delves into AGI&#8217;s potential to revolutionize various aspects of small businesses, including automation, customer service, marketing, data analysis, and financial management. Through a series of lessons,',
    'https://carsi.com.au/wp-content/uploads/2024/05/Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":30263,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"}],"wp_tags":[],"original_price":"","sale_price":""}'::jsonb
  ),
  (
    'hvacsystems',
    'Introduction to HVAC Systems and Drying Strategies',
    '<style>/*! elementor - v3.21.0 - 15-04-2024 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-hvac-systems-and-drying-strategies/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">HVAC Components</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Water Damage Impacts</li>
<li>Drying Considerations</li>
<li>Restorative Cleaning</li>
<li>Reconstructive Requirements</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide a comprehensive understanding of HVAC systems and drying strategies. It covers HVAC components such as ductwork, heat exchangers, air handling equipment, and terminal equipment. Additionally, it explores the impacts of water damage on HVAC systems, drying considerations, restorative cleaning techniques, reconstructive requirements, and maintenance strategies to ensure optimal system performance and indoor air quality.
 
Course Dur',
    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":30096,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'science',
    'Introduction to Psychrometry Science and Calculations',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-psychrometry-science-and-calculations/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Psychrometrics Charts</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Psychrometrics Calculations</li>
<li>Instrumentation</li>
<li>Applying Psychrometrics</li>
<li>Atmospheric Impacts</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course offers a concise overview of psychrometry, covering charts, calculations, instrumentation, applications, and atmospheric impacts. Students learn to interpret psychrometric data, perform calculations, and utilize instruments like psychrometers and data loggers. Practical applications include equipment selection, drying rate analysis, and considering atmospheric conditions for effective moisture management.
 
Course Duration:
Approx 30 Minutes
CEC ',
    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":30086,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'advancedstructural',
    'Introduction to Advanced Structural Drying Concepts',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-advanced-structural-drying-concepts/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Building Science</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Controlled Drying Methods</li>
<li>Verification</li>
<li>Large Loss Drying </li>
<li>Specialised Drying Knowledge</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide comprehensive understanding and practical skills in building science, controlled drying methods, verification techniques, large loss drying strategies, and specialized drying knowledge.
From mastering heat transfer principles to implementing specialized drying techniques for unique materials, students will learn to navigate airflow dynamics, psychrometric interactions, and factors influencing drying.
Emphasis is placed on validati',
    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":30058,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'forensic',
    'Introduction to Forensic Investigations for Water Losses',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-forensic-investigations-for-water-losses/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Reasons for Investigations</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Methods</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Failure Analysis</li>
<li>Presenting Findings</li>
<li>Establishing Cost of Loss</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to offer a thorough understanding of forensic investigations for water losses, covering reasons for investigations, methods used, failure analysis, presenting findings, and establishing the cost of loss.
Topics include resolving claim disputes, equipment malfunctions, alleged negligence, and change order justification.
Methods range from directed inspections to moisture mapping and microbial colonization observation.
Presenting findings invo',
    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":30052,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'biologicalcontaminants',
    'Introduction to Biological Contaminants and Treatments',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-biological-contaminants-and-treatments/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Contamination Sources</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Assessment Diagnostics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Remediation Strategies</li>
<li>Safety Controls</li>
<li>Clearance Verification</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide an understanding of biological contaminants and their treatments.
It covers contamination sources such as sewage backflows, flooded landscapes, rodent infestations, and microbial reservoir materials.
Assessment diagnostics include ATP testing, Petri dish analysis, bulk/air sampling, and laboratory quantification, leading to remediation strategies like physical removal, chemical disinfection, and electrochemical treatments. Safety ',
    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-Copy-of-drying-techniques-2.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":30046,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'applied-microbial',
    'Introduction to Applied Microbial Remediation',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-applied-microbial-remediation/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Microbial Amplification</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Remediation Planning</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Execution</li>
<li>Verification</li>
<li>Contractor Standards</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course provides a thorough overview of Applied Microbial Remediation, covering Microbial Amplification, Remediation Planning, Execution, Verification, and Contractor Standards. Topics include mold growth conditions, health effects, containment setup, equipment selection, post-remediation inspection, and licensing requirements, ensuring comprehensive training in industry best practices.
 
Course Duration:
Approx 30 Minutes
CEC Credits
1 Hour

 
The IICRC',
    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-drying-techniques-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":29785,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'water-losses',
    'Introduction to Project Management for Water Losses',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-project-management-for-water-losses/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Initial Response</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Planning</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Execution</li>
<li>Closeout</li>
<li>Risk Management</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide a comprehensive overview of water loss project management, covering key steps from initial response to risk management. It emphasizes planning, coordination, and proactive risk mitigation for successful restoration projects.

 
Course Duration:
Approx 30 Minutes
CEC Credits
1 Hour

 
The IICRC does not endorse any educational provider, product, offering, 
or service. The Institute expressly disclaims responsibility, 
endorsement o',
    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-Copy-of-drying-techniques-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":29647,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'moisture-mapping',
    'Introduction to Digital Moisture Mapping',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-digital-moisture-mapping/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Moisture Data Collection</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Data Management Software</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Moisture Distribution Analysis</li>
<li>Report Generation</li>
<li>Process Optimisation</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide a comprehensive understanding of digital moisture mapping techniques for water damage restoration. Participants will learn about accurate data collection methods, management software, and analysis techniques. Through the course, they&#8217;ll gain skills in optimizing drying processes, generating comprehensive reports, and supporting insurance claims.

 
Course Duration:
Approx 30 Minutes
CEC Credits
1 Hour

 
The IICRC does not e',
    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-Copy-of-drying-techniques.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":29593,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'upholstery',
    'Introduction to Upholstery Cleaning and Drying',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-upholstery-cleaning-and-drying/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Upholstery Fabrics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Water Damage Effects</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning Methods</li>
<li>Drying Considerations</li>
<li>Health Concerns</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to equip participants with essential knowledge and skills for upholstery cleaning and drying. Covering topics such as upholstery fabrics, water damage effects, cleaning methods, drying considerations, and health concerns, participants will learn how to effectively remove contaminants and moisture while preserving upholstery integrity. Through comprehensive instruction, participants will gain insights into selecting appropriate cleaning techn',
    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-drying-techniques.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":29502,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'smokeandsoot',
    'Introduction to Smoke and Soot Damage Restoration',
    '<h3>Already Purchased This Course? </h3>
<p>					<a href="https://carsi.com.au/courses/introduction-to-smoke-and-soot-damage-restoration/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Fire Dynamics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Assessment</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Smoke Particulates</li>
<li>Cleaning Challenges</li>
<li>Odour Control Methods</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
Introduction to Smoke and Soot Damage Restoration provides essential knowledge and skills for addressing fire-related damage. Participants learn fire dynamics, assessing damage, smoke particulates characteristics, cleaning challenges, and odor control methods. Topics include combustion factors, deposition behaviors, and distinguishing old/new damage. The course covers dry soot aggregates, oily residues, toxic vapors, and cleaning challenges. Participants exp',
    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-drying-techniques.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":29471,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'social-media-marketing',
    'Introduction to Social Media Marketing',
    '<style>/*! elementor - v3.19.0 - 07-02-2024 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-facebook-marketing/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">How, What and Whys</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Setting Up Your Facebook Presence</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Facebook Ad Types</li>
<li>Targeting Your Facebook Audience</li>
<li>Structuring Your Facebook Ad Campaigns</li>
<li>Bidding and Budgeting</li>
<li>Analysing Performance and Optimisation</li>
<li>Advanced Facebook Tools and Features</li>
<li>Additional Social Media Platforms to Consider for Advertising</li>
<li>Additions</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?

 This course covers Facebook marketing essentials for small businesses. Starting with goal setting and creating a Facebook presence, it moves on to ad types, audience targeting, campaign structuring, bidding, and budgeting. Participants learn to analyze performance, optimize ads, and utilize advanced Facebook tools. Additionally, it explores advertising on other platforms like Instagram and TikTok for an omni-channel approach.
 
Course Duration:
3 to 4 Hour',
    'https://carsi.com.au/wp-content/uploads/2024/02/social-media-marketing-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    79,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":29142,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":62,"name":"Membership","slug":"membership"}],"wp_tags":[],"original_price":"79","sale_price":""}'::jsonb
  ),
  (
    'duct-cleaning',
    'Introduction to Residential Duct Cleaning',
    '<style>/*! elementor - v3.18.0 - 20-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/shop/duct-cleaning/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">The Business of Residential Cleaning</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Understanding Residential HVAC Systems</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Contact Vs. Negative Pressure Duct Cleaning</li>
<li>Negative Air Duct Cleaning Systems</li>
<li>The Dust Master Contact Cleaning System</li>
<li>Vent Vac Dryer Duct Cleaning System</li>
<li>Cobra Power Brush Duct Cleaning System</li>
<li>The Residential Duct Cleaning Process</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?

&#8220;The Business of Residential Cleaning&#8221; course provides a comprehensive guide to starting a successful duct cleaning business.
Covering market research, target customer identification, licensing, insurance, marketing strategies, and customer education. It explores HVAC systems, duct cleaning methods, and equipment selection.
The course concludes with practical insights into specific cleaning systems and tools.This course prepares you for a succes',
    'https://carsi.com.au/wp-content/uploads/2023/12/DUCT-CLEANING.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'draft',
    0,
    true,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":28689,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"}],"wp_tags":[],"original_price":"","sale_price":""}'::jsonb
  ),
  (
    'water-damage-estimating',
    'Introduction to Water Damage Estimating',
    '<style>/*! elementor - v3.18.0 - 20-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-water-damage-estimating/lessons/introduction-to-water-damage-estimating/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Assessment</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Scope Development</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Quantification</li>
<li>Insurance Estimating</li>
<li>Bid Analysis</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?

This course aims to provide a comprehensive understanding of water damage assessment, covering categorization, damage documentation, identification of affected materials, and loss timeline considerations. Scope development encompasses drying, remediation, structural repairs, and contents manipulation, with quantification involving measurements, unit costs, overhead factors, and equipment/labor tally.
The course also delves into insurance estimating, bid ana',
    'https://carsi.com.au/wp-content/uploads/2023/12/water-damage-estimating-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":28650,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":4007,"name":"Mould","slug":"mould"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'water-damage-commercial',
    'Introduction to Water Damage in Commercial Buildings',
    '<style>/*! elementor - v3.18.0 - 20-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-water-damage-in-commercial-buildings/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Common Causes</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Major System Vulnerabilities</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Loss Impacts</li>
<li>Drying Considerations</li>
<li>Reconstruction Factors</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course provides a thorough overview of managing commercial water disasters, covering causes, vulnerabilities, and impacts.
Topics include drying considerations, reconstruction factors, and practical strategies for prevention and recovery.
The course concludes with essential insights into effective disaster management practices for commercial settings.

 
Course Duration:
Approximately 30 minutes
Continuing Education Credit:
This course is approved for I',
    'https://carsi.com.au/wp-content/uploads/2023/12/water-damage-commercial-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":28620,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4007,"name":"Mould","slug":"mould"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'porous-drying',
    'Introduction to Porous Materials Drying',
    '<style>/*! elementor - v3.18.0 - 20-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-porous-materials-drying/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Porosity and Moisture</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Porous Materials in Buildings</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Drying Challenges</li>
<li>Drying Methods</li>
<li>Indicating Dryness</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide a comprehensive understanding of porosity and moisture in diverse materials, focusing on their impact on building components.
It covers porosity definition, moisture absorption, sorption dynamics, and monitoring techniques. The course explores challenges in drying porous materials such as trapped moisture, wicking effects, and complex geometries. Different drying methods, including air circulation, desiccant drying, and low grain ',
    'https://carsi.com.au/wp-content/uploads/2023/12/porous-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":28586,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'introduction-to-advanced-drying-equipment-and-methods',
    'Introduction to Advanced Drying Equipment and Methods',
    '<style>/*! elementor - v3.19.0 - 29-01-2024 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-advanced-drying-equipment-and-methods/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Desiccant Systems</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Mechanical Drying Elements</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Air Treatment Technologies</li>
<li>Monitoring Equipment</li>
<li>Software Tools.</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to explore Advanced Drying Equipment and Methods comprehensively.
Participants will learn about desiccant systems, mechanical drying elements, air treatment technologies, monitoring equipment, and software tools. Topics include crystal towers, dense air drying, vacuum freeze drying, air scrubbers, humidity sensors, psychrometric calculators, and more. The course emphasizes practical applications, specialized considerations, and efficient lar',
    'https://carsi.com.au/wp-content/uploads/2023/12/advanced-drying-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":28290,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'structural-drying-2',
    'Introduction to Applied Structural Drying',
    '<style>/*! elementor - v3.18.0 - 08-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-applied-structural-drying/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Building Components</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Drying Dynamics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Drying Equipment</li>
<li>Drying Techniques</li>
<li>Monitoring and Documenting</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide a basic yet comprehensive exploration of moisture management and structural drying techniques.
Participants will delve into assessing water infiltration in foundational elements, evaluating moisture pathways in various building systems, and addressing the effects of water damage. The curriculum covers essential drying dynamics, equipment usage, and techniques such as evaporative drying, controlled environment drying, desiccant dry',
    'https://carsi.com.au/wp-content/uploads/2023/12/applied-structural-drying-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":28258,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4007,"name":"Mould","slug":"mould"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'water-damage',
    'Introduction to Water Damage Principles',
    '<style>/*! elementor - v3.18.0 - 08-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-water-damage-principles/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety and Health</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Remediation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Psychrometrics</li>
<li>Microbial Concerns</li>
<li>Damage Assessment</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course offers a comprehensive overview of occupational safety and health practices in the United States and Australia. Covering OSHA training, PPE needs, and hazard identification, it emphasizes worker safety, occupant health, and Australian safety standards.
The curriculum includes insights into the remediation process, encompassing water extraction, drying techniques, and ongoing evaluation. Key components such as psychrometrics, microbial concerns, a',
    'https://carsi.com.au/wp-content/uploads/2024/07/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-5-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":28177,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":4007,"name":"Mould","slug":"mould"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'carpet-cleaning',
    'Introduction to Basic Carpet Cleaning and Drying',
    '<style>/*! elementor - v3.18.0 - 06-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-basic-carpet-cleaning-and-drying/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Carpet Construction</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Water Damage Effects</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning Equipment</li>
<li>Cleaning Products</li>
<li>Drying Techniques</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course covers comprehensive insights into carpet construction, water damage effects, cleaning equipment, and drying techniques.
Participants learn about various carpet fibers, their characteristics, and how they impact cleaning decisions. The curriculum also addresses water damage effects and equips learners with practical skills in using equipment and cleaning agents for efficient carpet restoration.
The course emphasises the importance of water extrac',
    'https://carsi.com.au/wp-content/uploads/2023/12/basic-carpet-cleaning.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'CCT',
    NULL,
    '{"wp_id":28084,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'odour-control',
    'Introduction to Odour Control and Removal Techniques',
    '<style>/*! elementor - v3.18.0 - 06-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-odour-control-and-removal-techniques/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Odour Basics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Containment Strategies</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Air Purification Methods</li>
<li>Odour Counteractants</li>
<li>Surface Treatments</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course provides a comprehensive understanding of odour control and removal techniques. Beginning with fundamentals like odour causes and health effects, it explores containment strategies, air purification methods, and odor counteractants.
The curriculum covers surface treatments such as cleaning, sealants, and fogging to eliminate embedded smells. Real-life examples illustrate the practical application of these techniques, ensuring participants gain in',
    'https://carsi.com.au/wp-content/uploads/2023/12/odour-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'OCT',
    NULL,
    '{"wp_id":28076,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":4007,"name":"Mould","slug":"mould"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'psychrometry-drying',
    'Introduction to Psychrometry and the Drying Process',
    '<style>/*! elementor - v3.18.0 - 20-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/psychrometry-and-the-drying-process/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Psychrometric Chart</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Applying Psychrometrics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Phases of Drying</li>
<li>Calculating Drying Rates</li>
<li>Impact on Restoration</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course offers a comprehensive understanding of psychrometrics and its practical application in restoration.
Participants learn to set drying goals, monitor conditions, and specify equipment using the psychrometric chart. The curriculum covers drying phases, rate calculations, and industry benchmarks.
Insights into the impact of psychrometrics on preventing secondary damage, ensuring structural stability, defining remediation scope, and guiding reconstru',
    'https://carsi.com.au/wp-content/uploads/2023/12/PSYCHROMETRY-1-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":28069,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'structural-drying',
    'Introduction to Structural Drying Concepts',
    '<style>/*! elementor - v3.18.0 - 06-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-structural-drying-concepts/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Building Science</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Drying Dynamics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Monitoring Structural Drying</li>
<li>Drying Systems</li>
<li>Restorative Drying Standards</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course provides a comprehensive understanding of building science principles in the context of restoration.
Participants explore key areas, including controlled heat application for efficient evaporation, airflow management, psychrometrics, and drying dynamics. The module on monitoring structural drying emphasises measurable benchmarks, equipment considerations, and safety. The course concludes with a focus on restorative drying standards, incorporating',
    'https://carsi.com.au/wp-content/uploads/2023/12/structural-drying-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":28062,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'water-extraction',
    'Introduction to Water Extraction Methods',
    '<style>/*! elementor - v3.18.0 - 06-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-water-extraction-methods/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Purpose of Extraction</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Extraction Equipment</li>
<li>Extraction Techniques</li>
<li>Waste Disposal</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course offers a concise yet comprehensive understanding of water extraction for effective restoration.
Participants learn to promptly remove water, minimising secondary damage and initiating the drying process. Safety considerations, equipment exploration, extraction techniques, waste disposal practices, and regulatory compliance are covered to ensure participants gain essential skills for efficient and safe restoration processes.
Course Duration:
Appro',
    'https://carsi.com.au/wp-content/uploads/2023/12/water-extraction-1-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":28055,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'drying-techniques',
    'Introduction to Drying Techniques and Equipment',
    '<style>/*! elementor - v3.18.0 - 06-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/drying-techniques-and-equipment/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Moisture Basics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Drying Science</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Drying Equipment</li>
<li>Structural Drying</li>
<li>Restoring Contents</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course provides a concise yet comprehensive overview of moisture dynamics, drying science, and restoration techniques.
Participants learn key elements such as evaporation, psychrometrics, and specialised equipment use. The training covers drying considerations for different materials and areas, as well as content restoration methods.
By the course end, participants acquire essential knowledge and skills for effective moisture management and restoration ',
    'https://carsi.com.au/wp-content/uploads/2023/12/drying-techniques-2.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'ASD',
    NULL,
    '{"wp_id":28047,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'mould-identification',
    'Introduction to Mould Identification and Remediation',
    '<style>/*! elementor - v3.18.0 - 06-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-mould-identification-and-remediation/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Mould Basics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Identification</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Personal Protective Equipment</li>
<li>Remediation</li>
<li>Post Remediation</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course provides a basic understanding of mould identification and remediation. It covers mould basics, identification methods, and remediation procedures, emphasising the use of Personal Protective Equipment (PPE). Participants gain the knowledge and skills for safe and effective mould remediation, promoting occupant health and preventing recurrence.
Course Duration:
Approximately 30 minutes
Continuing Education Credit:
This course is approved for IICRC',
    'https://carsi.com.au/wp-content/uploads/2023/12/mould-identification.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":28039,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'using-ppe',
    'Introduction to Using Personal Protective Equipment',
    '<style>/*! elementor - v3.18.0 - 06-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/using-personal-protective-equipment/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Respiratory Protection</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Eye and Face Protection</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Head Protection</li>
<li>Hearing Protection</li>
<li>Body Protection</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course offers a comprehensive introduction to the proper use of Personal Protective Equipment (PPE) in diverse workplaces.
Participants will learn about respiratory, eye, face, head, and hearing protection, including details on sizing, fit testing, inspection, and maintenance.
The course also covers body protection, addressing materials, designs, care, and high-visibility apparel for overall workplace safety.
Course Duration:
Approximately 30 minutes
Co',
    'https://carsi.com.au/wp-content/uploads/2023/12/ppe.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":28031,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'safety-procedures',
    'Introduction to Safety Procedures for Water Damage Work',
    '<style>/*! elementor - v3.18.0 - 06-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/safety-procedures/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Assessing Hazards</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Use of PPE</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Exposure Controll</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Equipment Safety</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course offers a basic understanding of safety procedures in water damage work, focusing on hazard assessment, proper use of personal protective equipment (PPE), and exposure control measures. Participants learn to address physical hazards, chemical dangers like mold and sewage, and environmental risks such as noise and temperature extremes.
Practical training covers the use of respiratory, dermal, ocular, and hearing protection, along with exposure cont',
    'https://carsi.com.au/wp-content/uploads/2023/12/water-damage.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":28021,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'introduction-to-water-damage-restoration-course',
    'Introduction to Water Damage Restoration',
    '<style>/*! elementor - v3.18.0 - 06-12-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="https://carsi.com.au/courses/introduction-to-water-damage-restoration/lessons/introduction-to-water-damage-restoration/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Health and Safety</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Inspecting Water Damage</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Controlling Moisture Sources</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Water Extraction Methods</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Drying Equipment and Set Up</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This course covers foundational aspects of water damage restoration, including health and safety practices, the use of Personal Protective Equipment (PPE), and safety hazards at water damage sites.
Participants learn to inspect and categorise water damage, control moisture sources, and use drying equipment.
The curriculum also includes cleaning and deodorising techniques, concluding with participants gaining essential knowledge and practical skills for succe',
    'https://carsi.com.au/wp-content/uploads/2023/12/water-damage-restoration-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    29,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    'WRT',
    NULL,
    '{"wp_id":28000,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"29","sale_price":""}'::jsonb
  ),
  (
    'laser-measure',
    'Laser Measurer Assistance Video',
    '',
    'Laser Distance Measurer Assistance
 
Welcome to our latest video unveiling the incredible features of the Laser Distance Measurer, a revolutionary tool that has raised the bar in precision metrics. Dive into the video to explore key functionalities that set this device apart from its predecessor, witnessing firsthand the upgraded accuracy and performance it brings to the table. We&#8217;ll walk you through the cost-efficient aspects that make this model a standout investment, emphasising its val',
    'https://carsi.com.au/wp-content/uploads/2023/11/LASER-DISTANCE-MEASURER-ASSISTANCE.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":26831,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":59,"name":"Free Courses | Start Learning Restoration with CARSI","slug":"free-courses"},{"id":62,"name":"Membership","slug":"membership"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"}],"wp_tags":[],"original_price":"0","sale_price":""}'::jsonb
  ),
  (
    'chat-gpt',
    'Comprehensive Chat GPT Cheat Sheet',
    '',
    'Comprehensive Chat GPT Cheat Sheet
 
Unlock the power of ChatGPT with our comprehensive cheat sheet, your essential guide to mastering natural language understanding and conversation generation!
Add to cart for a downloadable version!',
    'https://carsi.com.au/wp-content/uploads/2023/09/chat-gpt.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":26496,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":59,"name":"Free Courses | Start Learning Restoration with CARSI","slug":"free-courses"},{"id":62,"name":"Membership","slug":"membership"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"}],"wp_tags":[],"original_price":"0","sale_price":""}'::jsonb
  ),
  (
    'technician-flow-chart',
    'Technician Flow Chart',
    '',
    'Technician Flow Chart
 
The Technician Flow Chart is a must-have tool. This concise and professional chart provides an easy-to-read overview of the essential steps in problem-solving. With its clear structure and user-friendly design, the Technician Flow Chart is an indispensable resource for efficient and successful technical problem-solving.
Add to cart for a downloadable version!',
    'https://carsi.com.au/wp-content/uploads/2023/06/Screenshot-2023-06-19-112619.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":25587,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":59,"name":"Free Courses | Start Learning Restoration with CARSI","slug":"free-courses"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":62,"name":"Membership","slug":"membership"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"}],"wp_tags":[],"original_price":"0","sale_price":""}'::jsonb
  ),
  (
    'carsi-chatgpt-ebook',
    'CARSI CHATGPT EBook',
    '<p style="margin: 0in; font-family: Calibri; font-size: 11.0pt;">Some of the Prompts included:</p>
<p style="margin: 0in; font-family: Calibri; font-size: 11.0pt;">Act as Position</p>
<p style="margin: 0in; font-family: Calibri; font-size: 11.0pt;">Act as an Advertiser</p>
<p style="margin: 0in; font-family: Calibri; font-size: 11.0pt;">Act as a Leader</p>
<p style="margin: 0in; font-family: Calibri; font-size: 11.0pt;">Act as a Motivational Coach</p>
<p style="margin: 0in; font-family: Calibri; font-size: 11.0pt;">Act in Logistics</p>
<p style="margin: 0in; font-family: Calibri; font-size: 11.0pt;">Act as a Web Design Consultant</p>
<p style="margin: 0in; font-family: Calibri; font-size: 11.0pt;">Act as an Assistant</p>
<p style="margin: 0in; font-family: Calibri; font-size: 11.0pt;">Act as a Tech Reviewer</p>
<p style="margin: 0in; font-family: Calibri; font-size: 11.0pt;">Act as a Social Media Influencer</p>
<p style="margin: 0in; font-family: Calibri; font-size: 11.0pt;">And many more!</p>
',
    'What is ChatGPT and what are ChatGPT prompts?
 
ChatGPT is an artificial intelligence chatbot developed by OpenAI, it can answer questions and assist you with tasks, such as composing emails, essays, and code.
ChatGPT prompts are short statements or questions provided by users to guide the conversational direction with the language model. These prompts serve as input and help set the context for the model&#8217;s responses. Users can use prompts to ask questions, request information, seek assist',
    'https://carsi.com.au/wp-content/uploads/2023/05/GPT-BOOK.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    20,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":25197,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"}],"wp_tags":[],"original_price":"20","sale_price":""}'::jsonb
  ),
  (
    'large-loss-mastery-course-split-payment',
    'Large Loss Mastery Course Split Payment',
    '<p>Learn how to effectively apply the industry "Best Practices" when estimating and managing complex projects!<br />
<strong>The Large Loss Mastery - <em>ELITE</em></strong> course offers hands-on, on-site simulations conducted at a location and city where an event has the potential to occur. The ELITE course gives the attendee the opportunity to be a part of a team that competes against other teams to win the simulated, commercial fire, water, flood or natural disaster loss. The projects simulated in LLM-E are complex events that require knowledge and expertise to successfully complete. LLM-E is designed to give the attendee the tools necessary and the hands-on experience to compete for any size property damage loss and complete them efficiently and effectively.<br />
<strong>Large Loss Mastery -</strong> <strong><em>NEXT</em></strong>  Complex Project Management picks up where our <strong>Large Loss Mastery - ELITE</strong>  estimating and contracting course leaves off with a comprehensive approach to managing the job after winning the job.  The training event has hands-on case studies designed to provide the attendee with the knowledge of exactly how to manage commercial property loss opportunities and complete them efficiently and effectively.<br />
<strong>What attendees learn:</strong>  damage assessment, estimating, scoping, contracting, vital document recovery, critical path planning, communications, documentation and audit triggers. Project Planning, Critical Path Plan creation and management, communication and documentation, Invoicing, audit triggers, health and safety, commercial sizing for drying and temporary climate control and managing scope changes.</p>
',
    'CARSI is excited to bring you the Large Loss Mastery Course with Tom McGuire. We are thrilled to offer you the opportunity to attend this revolutionary course. Join us in Melbourne to learn how to effectively apply the industry “best practices” when estimating and managing complex projects!
The exclusive Large Loss Mastery Elite Course, spans over 3 days and offers exceptional accommodation recommendations, diverse case scenarios, thrilling activities, sightseeing opportunities, and unforgettabl',
    'https://carsi.com.au/wp-content/uploads/2022/07/Facebook-LLM-post.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'draft',
    1980,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":22800,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"}],"wp_tags":[],"original_price":"1980","sale_price":""}'::jsonb
  ),
  (
    'large-loss-mastery-super-course',
    'Large Loss Mastery Course',
    '<p>https://youtu.be/wSw0PcN9-OMLearn how to effectively apply the industry "Best Practices" when estimating and managing complex projects!<br />
<strong>The Large Loss Mastery - <em>ELITE</em></strong> course offers hands-on, on-site simulations conducted at a location and city where an event has the potential to occur. The ELITE course gives the attendee the opportunity to be a part of a team that competes against other teams to win the simulated, commercial fire, water, flood or natural disaster loss. The projects simulated in LLM-E are complex events that require knowledge and expertise to successfully complete. LLM-E is designed to give the attendee the tools necessary and the hands-on experience to compete for any size property damage loss and complete them efficiently and effectively.<br />
<strong>Large Loss Mastery -</strong> <strong><em>NEXT</em></strong>  Complex Project Management picks up where our <strong>Large Loss Mastery - ELITE</strong>  estimating and contracting course leaves off with a comprehensive approach to managing the job after winning the job.  The training event has hands-on case studies designed to provide the attendee with the knowledge of exactly how to manage commercial property loss opportunities and complete them efficiently and effectively.<br />
<strong>What attendees learn:</strong>  damage assessment, estimating, scoping, contracting, vital document recovery, critical path planning, communications, documentation and audit triggers. Project Planning, Critical Path Plan creation and management, communication and documentation, Invoicing, audit triggers, health and safety, commercial sizing for drying and temporary climate control and managing scope changes.</p>
<p><img src="https://carsi.com.au/wp-content/uploads/2022/06/Things-to-Do-in-Sydney-3-1024x512.png" sizes="(max-width: 1024px) 100vw, 1024px" srcset="https://i0.wp.com/carsi.com.au/wp-content/uploads/2022/06/Things-to-Do-in-Sydney-3.png?resize=1024%2C512&amp;ssl=1 1024w, https://i0.wp.com/carsi.com.au/wp-content/uploads/2022/06/Things-to-Do-in-Sydney-3.png?resize=300%2C150&amp;ssl=1 300w, https://i0.wp.com/carsi.com.au/wp-content/uploads/2022/06/Things-to-Do-in-Sydney-3.png?resize=768%2C384&amp;ssl=1 768w, https://i0.wp.com/carsi.com.au/wp-content/uploads/2022/06/Things-to-Do-in-Sydney-3.png?resize=1536%2C768&amp;ssl=1 1536w, https://i0.wp.com/carsi.com.au/wp-content/uploads/2022/06/Things-to-Do-in-Sydney-3.png?resize=2048%2C1024&amp;ssl=1 2048w, https://i0.wp.com/carsi.com.au/wp-content/uploads/2022/06/Things-to-Do-in-Sydney-3.png?resize=600%2C300&amp;ssl=1 600w, https://i0.wp.com/carsi.com.au/wp-content/uploads/2022/06/Things-to-Do-in-Sydney-3.png?w=3000&amp;ssl=1 3000w" alt="Novotel Accommodation" width="1024" height="512" /><br />
<a role="button" href="https://www.idem.events/r/carsi-training-session-ac6de113"><br />
Book Accommodation<br />
</a></p>
',
    'CARSI is excited to bring you the Large Loss Mastery Course with Tom McGuire. We are thrilled to offer you the opportunity to attend this revolutionary course. Join us in Melbourne to learn how to effectively apply the industry “best practices” when estimating and managing complex projects!
The exclusive Large Loss Mastery Elite Course, spans over 3 days and offers exceptional accommodation recommendations, diverse case scenarios, thrilling activities, sightseeing opportunities, and unforgettabl',
    'https://carsi.com.au/wp-content/uploads/2022/07/Facebook-LLM-post.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'draft',
    1980,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":22404,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":679,"name":"Face-to-Face Courses | In-Person Training by CARSI","slug":"face-to-face"}],"wp_tags":[],"original_price":"1980","sale_price":""}'::jsonb
  ),
  (
    'glass-cleaning-course',
    'Glass Cleaning Course',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/glass-cleaning-course"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Plan and Prepare</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Clean the Glass</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Glass Cleaning Video</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">BONUS: Window Tracks</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Glass Cleaning Quiz</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This Glass Cleaning Course covers the cleaning of glass surfaces, including windows. This course can assist employers with training requirements under the WHS legislation. It is an entry level window cleaning course that covers the fundamentals of glass cleaning. Learn what equipment and products you will need to start cleaning class.
Course Duration:
Approximately 30 Minutes
Continuing Education Credit:
This course is approved for IICRC Continuing Education',
    'https://carsi.com.au/wp-content/uploads/2022/05/GLASS-CLEANING.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    20,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":22276,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"}],"wp_tags":[],"original_price":"20","sale_price":""}'::jsonb
  ),
  (
    'fundamental-business-framework',
    'Fundamental Business Framework',
    '<h3>Already Purchased This Product?</h3>
<p>					<a href="https://carsi.com.au/courses/fundamental-business-framework/"><br />
									Access FBF<br />
					</a></p>
<p>Topics included are:</p>
<ul>
<li>Essentials - 11 Topics</li>
<li>Getting Started - 14 Topics</li>
<li>Hiring - 15 Topics</li>
<li>Company Administration - 18 Topics </li>
<li>Onboarding - 5 Topics</li>
<li>Marketing - 8 Topics</li>
<li>Training - 15 Topics</li>
<li>Growth - 11 Topics</li>
<li>Exit - 6 Topics</li>
</ul>
',
    'What can you expect from this course Package?
Welcome to the Fundamental Business Framework course package, where we delve deep into the essential pillars of successful business management.
Whether you&#8217;re an aspiring entrepreneur, a seasoned small business owner, or a manager aiming to enhance your skills, this course is designed to provide you with the knowledge and tools necessary to thrive in today&#8217;s competitive business landscape.
In this comprehensive course package, we cover a ',
    'https://carsi.com.au/wp-content/uploads/2022/04/FBF.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    770,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":21369,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"}],"wp_tags":[],"original_price":"770","sale_price":""}'::jsonb
  ),
  (
    'safe-work-method-statements-swms-course',
    'Safe Work Method Statements (SWMS) Course',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/safe-work-method-statements-swms-course/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safe Work Method Statements</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safe Work Method Statements with the Professional Carpet Cleaners and Restorers Podcast</li>
</ul>
',
    'What can you expect from this Course?
This course will help you understand the Safe work method statement document and how it is used to help prevent illness and injury at work. Enjoy the included &#8216;safe work method statement with the Professional Carpet cleaners and Restorers Podcast&#8217;!
Course Duration:
Approximately 1 Hour
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 1 Hour
Once completed please email support@carsi.com.au for your',
    'https://carsi.com.au/wp-content/uploads/2022/03/SAFE-WORK.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    20,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":21225,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":59,"name":"Free Courses | Start Learning Restoration with CARSI","slug":"free-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"}],"wp_tags":[],"original_price":"20","sale_price":""}'::jsonb
  ),
  (
    'job-safety-and-environmental-analysis-jsea-course',
    'Job Safety and Environmental Analysis (JSEA) Course',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/job-safety-and-environmental-analysis-jsea-course/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Job Safety and Environmental Analysis (JSEA)</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Professional Carpet Cleaners and Restorers Podcast</li>
</ul>
',
    'What can you expect from this Course?
Learn the importance of job safety and how to manage risk, with this Job safety and environmental analysis course. Make sure tasks are carried out safely with learning about the JSEA document. Also enjoy the Professional Carpet Cleaners and Restorers podcast included at the end!
Course Duration:
Approximately 1 Hour
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 1 Hour
Once completed please email support@ca',
    'https://carsi.com.au/wp-content/uploads/2022/03/JOB-SAFETY.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    20,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":21216,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":59,"name":"Free Courses | Start Learning Restoration with CARSI","slug":"free-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"}],"wp_tags":[],"original_price":"20","sale_price":""}'::jsonb
  ),
  (
    'standard-operating-procedures-sop-course',
    'Standard Operating Procedures (SOP) Course',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/standard-operating-procedures-sop/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Standard Operating Procedures</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Standard Operating Procedures from The Professional Carpet Cleaners and Restorers Podcast</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide an overview of the process writing required by the organizations in question, regulatory agencies, to be able to provide and maintain a safe working environment. Learn the how&#8217;s and whys in this FREE course complimented at the end with our &#8216;Standard operating procedures from the Professional Carpet cleaners and restorers podcast.&#8217;
Course Duration
Approximately 1 Hour
Continuing Education Credit:
This course is ap',
    'https://carsi.com.au/wp-content/uploads/2022/03/STANDARD-OPERATING.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    20,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":21209,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"20","sale_price":""}'::jsonb
  ),
  (
    'initial-inspection-report-course',
    'Initial Inspection Report Course',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/initial-inspection-report/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Initial Inspection Report Walk Through</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Initial Inspection Report Download</li>
</ul>
',
    'What can you expect from this Course?
This course provides participants with an understanding of HOW to complete an initial inspection report. There is a FREE template available to download at the end of the course. This course is available for FREE as part of our Foundation and Growth Membership packages.
Course Duration:
Approximately 40 Minutes
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 1 Hour
Once completed please email support@carsi.co',
    'https://carsi.com.au/wp-content/uploads/2021/10/INSPECTION.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    49,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":21065,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"49","sale_price":""}'::jsonb
  ),
  (
    'marketing-course',
    'Marketing Course',
    '<style>/*! elementor - v3.13.1 - 09-05-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Advertising</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Advertising Strategies</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Unique Selling Points</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Google Ad Words</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Social Media Posts</li>
</ul>
',
    'What can you expect from this Course?
As a small business owner sometimes, it can be overwhelming to try and manage everything yourself. You may lack the knowledge, skills, money, or time! If you have just started out, you may need a quick and easy run down of HOW to market your cleaning business and bring in more clients. Sign up today!
Course Duration:
Approximately 45 Minutes
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 1 Hour
Once complet',
    'https://carsi.com.au/wp-content/uploads/2021/10/MARKETING.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    99,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":20997,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"99","sale_price":""}'::jsonb
  ),
  (
    'risk-assessment-course',
    'Risk Assessment Course',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/risk-assessment-course/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Introduction to WH&amp;S</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazards and Risks</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazard Identification</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Managing Risks</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Risk Matrix</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Job Safety and Environmental Analysis</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safe Work Method Statements</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">WH&amp;S Communication and Consultation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Quiz</li>
</ul>
',
    'What can you expect from this Course?
Risk Management is one of the most important aspects within an organisation. It is a LEGAL obligation under the Workplace Health and Safety Act that all staff are trained to manage WHS risks.
CARSI&#8217;s Risk Assessment Course aims to improve the participants awareness and knowledge on managing risks. The objectives of this course include, increase awareness of the need to identify hazards, Improve the ability to identify hazards within the workplace, incr',
    'https://carsi.com.au/wp-content/uploads/2021/09/RISK-ASSESSMENT.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    99,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":20828,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"99","sale_price":""}'::jsonb
  ),
  (
    'level-1-mould-remediation',
    'Level 1 Mould Remediation',
    '<h2>Already Purchased This Course? </h2>
<p>					<a href="https://carsi.com.au/courses/level-1-mould-remediation/"><br />
									Access Here<br />
					</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Introduction to Mould</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Preparation for Mould Remediation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety Data Sheets</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Initial Inspection</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Mould Remediation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Waste and Disposal</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Upgrade to Level 2</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Level 1 Mould Remediation Certificate Quiz</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide participants with the foundation knowledge and skills required to understand the hazard of Mould and the impact it can cause to health. Understand the different types of Mould and environments in which it grows, and how to protect yourself with the use of personal protective equipment. You will be provided with the basic principles for cleaning and remediation to be able to combat Mould and its source.
Course Duration:
Approximate',
    'https://carsi.com.au/wp-content/uploads/2021/08/LEVEL-1-MOULD.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    49,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":20542,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"49","sale_price":""}'::jsonb
  ),
  (
    'admin-sole-trader',
    'Admin - Sole Trader',
    '<style>/*! elementor - v3.13.1 - 09-05-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; font-family: Calibri; font-size: 13.5pt;"><strong>Topics covered include:</strong></p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Customer Experience</li>
<li>Principles of Customer Experience</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Myer Briggs Personality Types</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Net Promoter Score</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Introduction to Marketing</li>
<li>Key Marketing Information</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Target Audiences</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Social Media Strategy</li>
<li>Smart Goals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Optimisation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Basic Analysis and Reporting</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Content Creation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Basic Invoicing and Accounting</li>
</ul>
',
    'What can you expect from this Course?
This course has been specifically designed for the sole trader of a cleaning company. Start your business with your best foot forward!
Course Duration:
Approximately 3.5 Hours
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 4 Hours
Once completed please email support@carsi.com.au for your Certificate of completion confirming your hours of Continuing Education Credits.


The IICRC does not endorse any educati',
    'https://carsi.com.au/wp-content/uploads/2021/06/admin.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    275,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":20306,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"275","sale_price":""}'::jsonb
  ),
  (
    'level-3-mould-remediation',
    'Level 3 - Mould Remediation',
    '<style>/*! elementor - v3.13.1 - 09-05-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/level-3-mould-remediation/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Introduction to Mould</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Level 3 Preparation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">The Framework of Health and Safety Regulations</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazards and Risks</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Risk Assessment</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Level 3 Mould Personal Protective Equipment</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Heat Exhaustion and Heat Stroke</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Level 3 Chemicals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Storing Chemicals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Level 3 Labelling</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Bacteria and Modes of Transmission</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Waste Types</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety Data Sheets</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Level 3 Moisture Meters</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Relative Humidity</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Building Materials</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Factors to consider for Moisture Meters</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Level 3 Initial Inspection</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Level 3 Containment</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Full Scale Containment</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Job Safety and Environmental Analysis</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safe Work Method Statements</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Other Documentation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Plant and Machinery</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Standard Operating Procedures</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Emergency Situations</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Emergency Documentation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Understanding Antimicrobials</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Completing Mould Remediation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Content Remediation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Finalising Mould Remediation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Level 3 Waste</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Level 3 Transferring Waste</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazardous Waste</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Disposing Chemicals and E Waste</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning Equipment and PPE</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide a more extensive and final look at Mould remediation following on from levels 1 and 2.
Course Duration:
Approximately 4.5 Hours
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 5 Hours
Once completed please email support@carsi.com.au for your Certificate of completion confirming your hours of Continuing Education Credits.


The IICRC does not endorse any educational provider, produ',
    'https://carsi.com.au/wp-content/uploads/2021/05/LEVEL-3-MOULD.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    149,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":19307,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"149","sale_price":""}'::jsonb
  ),
  (
    'level-2-mould-remediation',
    'Level 2 - Mould Remediation',
    '<style>/*! elementor - v3.13.1 - 09-05-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/level-2-mould-remediation/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Introduction to Mould</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Preparation for Mould Remediation - Level 2</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">The Framework of Health and Safety Regulations</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazards, Risks, and Control Measures</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Heat Exhaustion and Heat Stroke</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning Chemicals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Biological Hazards</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety Data Sheets</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Moisture Meters</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Initial Inspection - Level 2</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Containment</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Job Safety and Environmental Analysis</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Documentation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Plant and Machinery</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Emergency Situations</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Emergency Documentation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Mould Remediation Processes</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Disposal Mould Course</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Removing Waste</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Finalise Tasks</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Upgrade to Level 3 - Mould Remediation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Quiz</li>
</ul>
',
    'What can you expect from this Course?
This course will follow on from Level 1 and provide a further look at Mould remediation, providing extended skills for your business requirements.
Course Duration:
Approximately 3.5 Hours
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 4 Hours
Once completed please email support@carsi.com.au for your Certificate of completion confirming your hours of Continuing Education Credits.


The IICRC does not endorse',
    'https://carsi.com.au/wp-content/uploads/2021/05/LEVEL-2-MOUD.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    99,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":19116,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"99","sale_price":""}'::jsonb
  ),
  (
    'safety-data-sheet-sds-course',
    'Safety Data Sheet (SDS) Course',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/safety-data-sheets-course/"><br />
Access Here<br />
</a></p>
',
    'What can you expect from this Course?
This course aims to provide an overview of the process writing required by the organizations in question, regulatory agencies, to be able to provide and maintain a safe working environment. Learn the how&#8217;s and whys in this FREE course complimented at the end with our &#8216;Standard operating procedures from the Professional Carpet cleaners and restorers podcast&#8217;!
Course Duration:
Approximately 1.15 Hours
Continuing Education Credit:
This course ',
    'https://carsi.com.au/wp-content/uploads/2021/05/SAFETY-DATA.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    20,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":19049,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"}],"wp_tags":[],"original_price":"20","sale_price":""}'::jsonb
  ),
  (
    'affiliate-membership',
    'Affiliate Membership',
    '<p>Becoming an affiliate member of CARSI.</p>
<p>Affiliate membership is open to Organisations involved in small to medium sized companies with an active interest on business development and growth.</p>
<p>Applying to become an affiliate member recognises your involvement to CARSI members and guests.  The goal is to develop business, marketing, specialised fields, education awareness across the CARSI platform and all are welcome.  There will be numerous benefits to becoming a CARSI affiliate member including access to events, marketing materials, education, and experiencing a virtually un-tapped industry.</p>
<p>We believe CARSI offers a platform to advance thinking, developing of new skills, fuel for fulfilment and leadership.  We believe that collaboration, accountability, learning, and professional standards are important to the growth of the cleaning and restoration industries.  We provide invaluable, cost-saving membership privileges to support each member.</p>
',
    'Sign up for our yearly Affiliation Package of AU 220 dollars.
Under business consultants in the CARSI membership area is where your Business Name, Logo, and company blurb is displayed allowing our members constant access to your details.',
    'https://carsi.com.au/wp-content/uploads/2021/04/HISTORY-2021-04-06T153308.009.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'draft',
    220,
    false,
    NULL,
    NULL,
    'Membership',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":17600,"wp_categories":[{"id":62,"name":"Membership","slug":"membership"}],"wp_tags":[],"original_price":"220","sale_price":""}'::jsonb
  ),
  (
    'foundation-membership',
    'Foundation Membership',
    '<h2>Already Purchased This Membership?</h2>
<p><a role="button" href="/my-membership/"><br />
Access Here<br />
</a></p>
',
    'Memberships to support the cleaning and restoration industry. Whether you are a sole trader or an established company, we have a package for you!',
    'https://carsi.com.au/wp-content/uploads/2021/03/HISTORY-48.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    44,
    false,
    NULL,
    NULL,
    'Membership',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":17591,"wp_categories":[{"id":62,"name":"Membership","slug":"membership"}],"wp_tags":[],"original_price":"","sale_price":""}'::jsonb
  ),
  (
    'donning-and-doffing-ppe',
    'Donning and Doffing PPE',
    '<style>/*! elementor - v3.17.0 - 01-11-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a href="/courses/donning-and-doffing-ppe/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Personal Protective Equipment PPE</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Donning and Doffing PPE</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Heat Exhaustion and Heat Stroke</li>
</ul>
',
    'What can you expect with this Course?
This course aims to provide the understanding on PPE and its purpose. Learning how to use it correctly to protect yourself and those around you, including correct ways of disposal and how to be aware of the dangers of heat when wearing the equipment.
Course Duration:
Approximately 40 Minutes
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 1 Hour
Once completed please email support@carsi.com.au for your Certi',
    'https://carsi.com.au/wp-content/uploads/2021/03/DONNING-AND-DOFFING-1-1.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    39,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":16983,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"}],"wp_tags":[],"original_price":"39","sale_price":""}'::jsonb
  ),
  (
    'moisture-meter-course',
    'Moisture Meter Course',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/moisture-meter-training/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">How Moisture Was Read</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">The Process</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Ensuring Accuracy</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Reference Scale</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Temperatures</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Wood Warping Causes</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Moisture Testing</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Moisture Prevention</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Tips for Using a Moisture Meter</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Moisture Meter Accuracy</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Temperature and Accuracy</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Materials</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Factors</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">The Type of Meter</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">The Type of Material</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Maintenance of The Meter</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Mistakes with Moisture Meters</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Different Types</li>
</ul>
',
    'What can you expect from this Course?
Do you currently use moisture meters? Do you want to build your confidence in your knowledge and understanding of moisture meters and learn how they work?
Then join us in this course to expand your knowledge further.
Course Duration:
Approximately 2.5 Hours
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 3 Hours
Once completed please email support@carsi.com.au for your Certificate of completion confirming yo',
    'https://carsi.com.au/wp-content/uploads/2021/03/MOSITURE-METER.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    39,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":15931,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"39","sale_price":""}'::jsonb
  ),
  (
    'membership',
    'Growth Membership',
    '<h2>Already Purchased This Membership?</h2>
<p><a role="button" href="/my-membership/"><br />
Access Here<br />
</a></p>
',
    'Memberships to support the cleaning and restoration industry. Whether you are a sole trader or an established company, we have a package for you!',
    'https://carsi.com.au/wp-content/uploads/2021/03/growth.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    99,
    false,
    NULL,
    NULL,
    'Membership',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":15316,"wp_categories":[{"id":62,"name":"Membership","slug":"membership"}],"wp_tags":[],"original_price":"","sale_price":""}'::jsonb
  ),
  (
    'free-library',
    'Free Library',
    '<h2>Already Purchased This Membership?</h2>
<p><a role="button" href="/my-membership/"><br />
Access Here<br />
</a><br />
Our Free Resource Library includes access to:</p>
<ul>
<li><strong style="font-size: 16px;">Cleaning Essentials</strong></li>
<li><strong>Business Checklists</strong></li>
<li><strong>Types of Cleaning</strong></li>
<li><strong>Pay Guides for the Industry</strong></li>
<li><strong>Podcast Links?</strong></li>
<li><strong>And More!?</strong></li>
</ul>
',
    'Our Free Resource Library includes access to:







Donning and Doffing PPE






Job Safet and Environmental Analysis






Safe Work Method Statements






Standard Operating Procedures






And More!?',
    'https://carsi.com.au/wp-content/uploads/2021/03/Copy-of-EDUCATIONAL-SITES-COURSE.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    0,
    true,
    NULL,
    NULL,
    'Membership',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":15181,"wp_categories":[{"id":62,"name":"Membership","slug":"membership"}],"wp_tags":[],"original_price":"0","sale_price":""}'::jsonb
  ),
  (
    'carpet-cleaning-basics',
    'Carpet Cleaning Basics',
    '<style>/*! elementor - v3.13.1 - 09-05-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/carpet-cleaning-basics/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Introduction to Carpet Cleaning</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Basic Cleaning Chemistry</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Textile Flooring and Carpet Cleaning</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaners</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazardous Chemicals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Managing Risks for Hazardous Chemicals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety Data Sheets</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Labelling</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Fiber Identification</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Pre Cleaning Observation</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Fiber Characteristics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Equipment and Methods</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Standard Operation Procedures</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Basic Stain Removal Understanding</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Disposal</li>
</ul>
',
    'What can you expect from this course?
This course explains how to safely and professionally clean flooring and carpets, while learning how chemicals and the environment can be effective, to be able to restore them to their former glory.
Course Duration:
Approximately 2.5 Hours
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 3 Hours
Once completed please email support@carsi.com.au for your Certificate of completion confirming your hours of Contin',
    'https://carsi.com.au/wp-content/uploads/2021/02/CARPET-CLEANING-2.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    55,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    'CCT',
    NULL,
    '{"wp_id":13162,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"},{"id":63,"name":"Water Damage Courses | Training for Restoration Pros","slug":"water-damage-courses"}],"wp_tags":[],"original_price":"55","sale_price":""}'::jsonb
  ),
  (
    'asthmaallergy',
    'Asthma and Allergy Course',
    '<style>/*! elementor - v3.13.1 - 09-05-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/asthma-and-allergy-course/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Asthma and Allergies</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Asthma and Allergy Facts</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">The Relationship Between Allergic Diseases</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Dust Mite Allergies</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Pet Allergies</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Control and Prevention</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Environmental Control</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Anti Allergen Technology</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">How it Works</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Handling and Storage</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety Data Sheets</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Labelling</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Personal Protective Equipment PPE</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Donning and Doffing PPE</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Heat Exhaustion and Heat Stroke</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">The Anti Allergen Process</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Recommended Environmental Control Procedures</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Master Blend Product Range</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Disposal</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Documentation</li>
<li>Standard Operating Procedures</li>
<li>Marketing Opportunities</li>
<li>Unique Selling Points</li>
<li>Guarantees</li>
<li>Return on Investments</li>
</ul>
<p style="margin: 0in; font-family: Calibri; font-size: 13.5pt;">
',
    'What can you expect from this Course?
The professional cleaning industry is able to perform an important and valuable service for those suffering from asthma and allergies. Find out HOW with CARSI&#8217;s Asthma and Allergy Course!
Expand your business and services with an affordable new product out on the market!
Our CEO Phill McGurk has done extensive research and training for the MasterBlend ResponsibleCare Stystem.  If you are thinking of using or already are using the MasterBlend Responsibl',
    'https://carsi.com.au/wp-content/uploads/2021/02/ASTHMA-AND-ALLERGY.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    129,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":13157,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"}],"wp_tags":[],"original_price":"129","sale_price":""}'::jsonb
  ),
  (
    'infectious-control-for-the-business-owner',
    'Infectious Control for the Business Owner',
    '<style>/*! elementor - v3.13.1 - 09-05-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/infectious-control-for-the-business-owner/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Virus Facts</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Bacteria and Modes of Transmission</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning and Disinfecting for Health</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hygiene Practices</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Understanding Risks</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning Types and Touch Points</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cross Contamination</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Insurance and Liability</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Before the Job</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazard Identification</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Risk Assessments</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hierarchy of Controls</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety Data Sheets</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Labelling</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Standard Operating Procedures</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Job Safety and Environmental Analysis (JSEA)</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safe Work Method Statements (SWMS)</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">ATP Terminology</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hygiene Monitoring</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">ATP and Protocols</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Testing Protocols</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Examples</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Handling and Storage</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Chemicals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazardous Chemicals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Tools</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Application</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Microfiber Cloths</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Personal Protective Equipment PPE</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Donning and Doffing PPE</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Heat Exhaustion and Heat Stroke</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Disposal</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Quiz</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
Cleaners are essential workers and require increased training and knowledge in health cleaning. However, before you endeavor down the infectious control cleaning path, you need to ensure you and your business are prepared.
Study any time, anywhere, any pace, with Australia’s only CFO (Certified Forensic Operator) and CBFRS (Certified Bio-Forensic Restoration Specialist) Phillip McGurk, this course has been developed to educate cleaning companies of their req',
    'https://carsi.com.au/wp-content/uploads/2021/02/BUSINESS-OWNER.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    275,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":13150,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"}],"wp_tags":[],"original_price":"275","sale_price":""}'::jsonb
  ),
  (
    'using-atp-to-create-protocols',
    'Using ATP to Create Protocols',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/using-atp-to-create-protocols/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">ATP Terminology</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hygiene Monitoring</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">ATP and Protocols</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Testing Protocols</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Examples</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Quiz</li>
</ul>
',
    'What can you expect from this Course?
Cleaners are essential workers, and require increased training and knowledge in health cleaning. It is now more important than ever that you realise the enormous responsibility and reliance on your skills and knowledge.
This course is suited to those needing to test the efficiency and effectiveness of their cleaning protocols. It can assist in verifying chemicals, tools, and application methods to ensure that you are cleaning for health and not just removing',
    'https://carsi.com.au/wp-content/uploads/2021/02/ATP.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    20,
    false,
    NULL,
    NULL,
    'Admin Courses | Essential Skills for Restoration Managers',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":13147,"wp_categories":[{"id":55,"name":"Admin Courses | Essential Skills for Restoration Managers","slug":"admin"},{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":61,"name":"Management Courses | Build Leadership Skills with CARSI","slug":"management"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"}],"wp_tags":[],"original_price":"20","sale_price":""}'::jsonb
  ),
  (
    'infection-control-in-child-care',
    'Infection Control in Child Care',
    '<style>/*! elementor - v3.13.1 - 09-05-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/infection-control-in-child-care/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Virus Facts</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Bacteria and Modes of Transmission</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning and Disinfecting for Health</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cross Contamination</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hygiene Practices</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">When to Wash Hands</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Alcohol Based Hand Rub</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Gloves</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning Types and Touch Points</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safe and Effective Disinfecting</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Using Products Safely</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety Data Sheets</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Labelling</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Microfiber Cloths</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Soft Surfaces</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Electronics</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Laundry</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Outdoor Areas</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Toys</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Nappy Changes</li>
<li>Food Preparation and Handling</li>
<li>Washing, Feeding and Holding Children</li>
<li>Quiz</li>
</ul>
',
    'What can you expect from this Course?
Child Care Centres are receiving a lot of questions from parents in regard to providing a safe environment for the children they care for and require increased training and knowledge in health cleaning. It is now more important than ever that you realise the enormous responsibility and reliance on your skills and knowledge.
Study any time, anywhere, any pace, with Australia’s only CFO (Certified Forensic Operator) and CBFRS (Certified Bio-Forensic Restoratio',
    'https://carsi.com.au/wp-content/uploads/2021/02/CHILD-CARE.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    99,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":13143,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"}],"wp_tags":[],"original_price":"99","sale_price":""}'::jsonb
  ),
  (
    'neosan-labs-product-training-course',
    'NeoSan Labs Product Training',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/neosan-labs-product-training/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">The History of Neosan Labs</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Understanding Chemicals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazardous Chemicals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Managing Risks for Hazardous Chemicals</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Product Breakdown: Part B Hydrogen Peroxide</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Product Breakdown: Part A Cationic Surfactants</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Surfactants</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety Data Sheets</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Training and Application</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Calculations and Mixing</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Ultra Low Volume ULV Foggers</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Victory Innovations</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazard Identification</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Risk Assessments</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hierarchy of Controls</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Standard Operating Procedures</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Job Safety and Environmental Analysis</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safe Work Method Statements</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Business Growth, Sustainability and Opportunity</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Multi Resistant Organisms (MROs)</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">How Hospitals Stay Hygienic</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">How Effective are Cleaning Measures?</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Neosan Labs 1</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Neosan Labs 2</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Neosan Labs 3</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Neosan Labs 4</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">References and Documents</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Quiz</li>
</ul>
',
    'What can you expect from this Course?
This course aims to provide you with an understanding of the history behind Neosan Labs, how they work and what they leave behind. Obtain an understanding of the different types of chemicals and how they are effectively used.
Course Duration:
Approximately 4.5 Hours
Continuing Education Credit:
This course is approved for IICRC Continuing Education Credit (CEC) : 5 Hours
Once completed please email support@carsi.com.au for your Certificate of completion conf',
    'https://carsi.com.au/wp-content/uploads/2021/02/NEOSAN.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    99,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":13139,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"}],"wp_tags":[],"original_price":"99","sale_price":""}'::jsonb
  ),
  (
    'microbe-clean-basic-understanding-course',
    'Microbe Clean Basic Understanding Course',
    '<style>/*! elementor - v3.12.2 - 23-04-2023 */<br />.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}</style>
<h2>Already Purchased This Course?</h2>
<p><a role="button" href="/courses/microbe-clean-basic-understanding/"><br />
Access Here<br />
</a></p>
<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Topics covered include:</p>
<ul>
<li style="list-style-type: none;">
<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc">
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Virus Facts</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Bacteria and Modes of Transmission</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hygiene Practices</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning and Disinfecting for Health</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning Types and Touch Points</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cross Contamination</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Personal Protective Equipment PPE</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Donning and Doffing PPE</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Heat Exhaustion and Heat Stroke</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hazard Identification</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Risk Assessments</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Hierarchy of Controls</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Documentation and Reporting</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Standard Operating Procedures</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safety Data Sheets</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Labelling</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Handling and Storage</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Cleaning Procedures</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Job Safety and Environmental Analysis</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Safe Work Method Statements</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Signage and Precautions</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Spills</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Disposal</li>
<li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Microbe Clean - Basic Understanding Quiz</li>
</ul>
</li>
</ul>
',
    'What can you expect from this Course?
This Course offers a comprehensive knowledge of infection prevention and control. For cleaning businesses, it is essential to undergo infection cleaning training, covering topics such as: the spread of bacteria, proper cleaning and disinfecting methods for maintaining health, the use of personal protective equipment (PPE), recommended documentation, infection cleaning procedures, and other related aspects.
Course Duration:
Approximately 4.5 Hours
Continuing ',
    'https://carsi.com.au/wp-content/uploads/2021/02/MICROBE.png',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'published',
    99,
    false,
    NULL,
    NULL,
    'All Courses | Explore CARSI’s Full Course Catalogue',
    '[]'::jsonb,
    NULL,
    NULL,
    '{"wp_id":13109,"wp_categories":[{"id":43,"name":"All Courses | Explore CARSI’s Full Course Catalogue","slug":"view-all"},{"id":56,"name":"Carpet Cleaning Courses | Professional Training by CARSI","slug":"carpet-cleaning"},{"id":4006,"name":"CEC Credits","slug":"cecs"},{"id":57,"name":"Chemicals and Equipment","slug":"chemicals-and-equipment"},{"id":58,"name":"Cleaning Courses | Online Training for Professionals","slug":"cleaning-courses"},{"id":4005,"name":"Health &amp; Safety","slug":"health-safety"},{"id":60,"name":"Infectious Control Cleaning","slug":"infectious-control-cleaning"},{"id":64,"name":"Technician Courses | Expert Training for Restoration Techs","slug":"technician"}],"wp_tags":[],"original_price":"99","sale_price":""}'::jsonb
  )
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price_aud = EXCLUDED.price_aud,
  iicrc_discipline = EXCLUDED.iicrc_discipline,
  cec_hours = EXCLUDED.cec_hours,
  meta = EXCLUDED.meta;

-- ----------------------------------------------------------------------------
-- 4. Create lms_categories from WordPress export
-- ----------------------------------------------------------------------------
-- lms_categories table created in migration 002
INSERT INTO lms_categories (name, slug, description, parent_id)
VALUES
  ('Blog Post', 'blog-post', '', NULL),
  ('Business', 'business', 'Explore insights, strategies, and tools to grow your cleaning and restoration business in a competitive market.', NULL),
  ('Cleaning', 'cleaning', 'Tips, trends, and training for professional cleaners—covering techniques, safety, products, and industry best practices.', NULL),
  ('E-Learning Courses | Online Training for Restoration Pros', 'elearning', 'Access flexible, self-paced eLearning courses from CARSI. Learn cleaning, restoration, and management skills anytime, anywhere.', NULL),
  ('Education', 'education', '', NULL),
  ('Foundation', 'foundation', '', NULL),
  ('Growth', 'growth', '', NULL),
  ('Membership', 'membership', '', NULL),
  ('Newsletters', 'newsletters', 'Catch up on CARSI''s latest updates, promotions, event highlights, and educational opportunities in our monthly newsletters.', NULL),
  ('Restoration', 'restoration', 'Dive into expert articles on water, fire, and mould restoration—industry trends, case studies, and training resources.', NULL),
  ('View All', 'view-all', 'Browse all CARSI blog posts across categories including business, cleaning, restoration, and more—insight in every scroll.', NULL)
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- ============================================================================
-- Post-seed verification queries
-- ============================================================================
-- SELECT COUNT(*) AS course_count FROM lms_courses;
-- SELECT slug, title, iicrc_discipline, cec_hours FROM lms_courses;
