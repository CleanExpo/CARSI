'use client';

import React, { useState, useRef, useEffect } from 'react';

/**
 * Industry acronym/initialisms dictionary
 * Add new entries here as needed
 */
const ACRONYM_DICTIONARY: Record<string, string> = {
  // IICRC Certifications
  'IICRC': 'Institute of Inspection Cleaning and Restoration Certification',
  'CEC': 'Continuing Education Credit',
  'CECs': 'Continuing Education Credits',
  'WRT': 'Water Damage Restoration Technician',
  'AMRT': 'Applied Microbial Remediation Technician',
  'FSRT': 'Fire and Smoke Restoration Technician',
  'TCST': 'Trauma and Crime Scene Technician',
  'ASD': 'Applied Structural Drying',
  'HST': 'Health and Safety Technician',
  'CCT': 'Carpet Cleaning Technician',
  'UFT': 'Upholstery and Fabric Cleaning Technician',
  'RRT': 'Rug Cleaning Technician',
  'OCT': 'Odour Control Technician',
  'ASPWR': 'Applied Structural Drying for Plaster Wall Restoration',
  'CDS': 'Commercial Drying Specialist',
  'BMI': 'Building Moisture Inspector',
  
  // Industry Bodies
  'BSCAA': 'Building Service Contractors Association of Australia',
  'ISSA': 'International Sanitary Supply Association',
  'LASA': 'Leading Age Services Australia',
  'ACECQA': 'Australian Children\'s Education & Care Quality Authority',
  'MBA': 'Master Builders Association',
  'REIQ': 'Real Estate Institute of Queensland',
  
  // Education & Training
  'RTO': 'Registered Training Organisation',
  'TAFE': 'Technical and Further Education',
  'LMS': 'Learning Management System',
  'IEP': 'Indoor Environmental Professional',
  'CFO': 'Certified Fire and Smoke Restorer',
  'SBFRS': 'Small Business Fire Restoration Specialist',
  
  // Industry Terms
  'PPE': 'Personal Protective Equipment',
  'HEPA': 'High-Efficiency Particulate Air',
  'RH': 'Relative Humidity',
  'GPP': 'Grain Per Pound',
  'HVAC': 'Heating, Ventilation and Air Conditioning',
  'IAQ': 'Indoor Air Quality',
  'WHS': 'Work Health and Safety',
  'SWMS': 'Safe Work Method Statement',
  'SDS': 'Safety Data Sheet',
  'PCB': 'Polychlorinated Biphenyl',
  
  // Business
  'NRPG': 'National Remediation and Property Group',
  'CARSI': 'Cleaning and Restoration Science Institute',
  'DR': 'Disaster Recovery',
  'CRM': 'Customer Relationship Management',
  'MRR': 'Monthly Recurring Revenue',
  'GST': 'Goods and Services Tax',
  'ABN': 'Australian Business Number',
};

interface AcronymTooltipProps {
  /** The acronym text to display */
  text: string;
  /** Optional custom definition (overrides dictionary) */
  definition?: string;
  /** Optional className for styling */
  className?: string;
}

/**
 * AcronymTooltip — Hover tooltip for industry acronyms
 * 
 * Usage:
 *   <AcronymTooltip text="IICRC" />
 *   <AcronymTooltip text="WRT" definition="Custom definition" />
 * 
 * Or use the auto-replace utility:
 *   <AcronymHighlighter text="Get your IICRC WRT certification today" />
 */
export function AcronymTooltip({ text, definition, className = '' }: AcronymTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const fullText = definition || ACRONYM_DICTIONARY[text] || ACRONYM_DICTIONARY[text.toUpperCase()];
  
  if (!fullText) return <span>{text}</span>;

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // If too close to top, show below
      setPosition(rect.top < 80 ? 'bottom' : 'top');
    }
  }, [isVisible]);

  return (
    <span
      ref={triggerRef}
      className={`relative inline-block cursor-help ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      tabIndex={0}
      role="term"
      aria-label={`${text}: ${fullText}`}
    >
      <span className="border-b border-dotted border-current">
        {text}
      </span>
      {isVisible && (
        <span
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-50 px-3 py-2 text-sm font-normal text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg whitespace-nowrap max-w-xs
            ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2`}
        >
          <span className="font-semibold text-blue-300">{text}</span>
          <span className="mx-1">—</span>
          <span className="text-gray-100">{fullText}</span>
          {/* Arrow */}
          <span
            className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 
              ${position === 'top' 
                ? 'top-full border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-900 dark:border-t-gray-700' 
                : 'bottom-full border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-gray-900 dark:border-b-gray-700'
              }`}
          />
        </span>
      )}
    </span>
  );
}

/**
 * AcronymHighlighter — Auto-detects and wraps acronyms in a text string
 * 
 * Usage:
 *   <AcronymHighlighter text="Earn IICRC CECs with our WRT course" />
 */
interface AcronymHighlighterProps {
  text: string;
  className?: string;
}

export function AcronymHighlighter({ text, className = '' }: AcronymHighlighterProps) {
  const acronymPattern = new RegExp(
    `\\b(${Object.keys(ACRONYM_DICTIONARY).join('|')})\\b`,
    'g'
  );

  const parts = text.split(acronymPattern);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (ACRONYM_DICTIONARY[part]) {
          return <AcronymTooltip key={index} text={part} />;
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

export { ACRONYM_DICTIONARY };
export default AcronymTooltip;
