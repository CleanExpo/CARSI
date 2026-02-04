import { JobCardExample } from '@/components/JobCard';

/**
 * Demo Page
 *
 * Demonstrates Australian-first component with:
 * - en-AU spelling, dates, currency
 * - 2025-2026 design aesthetic
 * - Bento grid layout
 * - AI-generated custom icons (NO Lucide)
 */

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Australian Component Demo
          </h1>
          <p className="text-lg text-gray-600">
            Showcasing en-AU defaults, 2025-2026 aesthetic, and glassmorphism
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass-card">
            <h3 className="text-lg font-semibold text-primary-700 mb-2">
              🦘 Australian-First
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Dates: DD/MM/YYYY</li>
              <li>• Currency: AUD with GST</li>
              <li>• Phone: 04XX XXX XXX</li>
              <li>• Spelling: en-AU (colour, organisation)</li>
            </ul>
          </div>

          <div className="glass-card">
            <h3 className="text-lg font-semibold text-primary-700 mb-2">
              🎨 2025-2026 Design
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Bento grids</li>
              <li>• Glassmorphism</li>
              <li>• NO Lucide icons</li>
              <li>• Soft colored shadows</li>
            </ul>
          </div>

          <div className="glass-card">
            <h3 className="text-lg font-semibold text-primary-700 mb-2">
              ✅ Truth-First
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 4-tier source hierarchy</li>
              <li>• Confidence scoring</li>
              <li>• Publication blocking</li>
              <li>• Australian sources prioritised</li>
            </ul>
          </div>
        </div>

        {/* Component Demo */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            JobCard Component
          </h2>
          <p className="text-gray-600 mb-6">
            Water damage restoration job for Brisbane customer. Notice:
          </p>
          <ul className="text-sm text-gray-600 mb-6 space-y-1">
            <li>✅ Phone formatted as <strong>0412 345 678</strong> (Australian mobile)</li>
            <li>✅ Address formatted as <strong>Street, Suburb STATE POSTCODE</strong></li>
            <li>✅ Date formatted as <strong>08/01/2025</strong> (DD/MM/YYYY)</li>
            <li>✅ Currency as <strong>$2,750.00</strong> (AUD)</li>
            <li>✅ GST calculated at <strong>10%</strong> ($250.00)</li>
            <li>✅ Custom AI-generated icons (water drop, calendar, location, phone)</li>
            <li>✅ Glassmorphism card with soft teal shadow</li>
            <li>✅ Micro-interactions on hover (scale: 1.02)</li>
          </ul>

          <div className="bento-grid">
            <div className="bento-item-small">
              <JobCardExample />
            </div>
            <div className="bento-item-small">
              <JobCardExample />
            </div>
            <div className="bento-item-small">
              <JobCardExample />
            </div>
          </div>
        </div>

        {/* System Enforcement Notice */}
        <div className="glass-card mt-8 border-2 border-primary-200">
          <h3 className="text-lg font-semibold text-primary-700 mb-3">
            🔒 System Enforcement
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>pre-response.hook</strong>: Loaded australian-context.skill.md automatically
            </p>
            <p>
              <strong>design-system.skill.md</strong>: Enforced 2025-2026 aesthetic (NO Lucide icons)
            </p>
            <p>
              <strong>verification-first.skill.md</strong>: Would verify all data before deployment
            </p>
            <p>
              <strong>pre-publish.hook</strong>: Would invoke Truth Finder for any content claims
            </p>
            <p>
              <strong>pre-deploy.hook</strong>: Would block deployment if Lighthouse &lt;90 or tests fail
            </p>
          </div>
        </div>

        {/* Australian Context Utilities Demo */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Australian Context Utilities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card">
              <h4 className="font-semibold text-gray-900 mb-2">Date Formatting</h4>
              <code className="text-sm text-primary-600">
                formatDateAU(new Date('2025-01-08'))<br />
                → "08/01/2025"
              </code>
            </div>

            <div className="glass-card">
              <h4 className="font-semibold text-gray-900 mb-2">Currency Formatting</h4>
              <code className="text-sm text-primary-600">
                formatCurrencyAUD(2500.00)<br />
                → "$2,500.00"
              </code>
            </div>

            <div className="glass-card">
              <h4 className="font-semibold text-gray-900 mb-2">Phone Formatting</h4>
              <code className="text-sm text-primary-600">
                formatPhoneAU('0412345678')<br />
                → "0412 345 678"
              </code>
            </div>

            <div className="glass-card">
              <h4 className="font-semibold text-gray-900 mb-2">GST Calculation</h4>
              <code className="text-sm text-primary-600">
                calculateGST(2500.00)<br />
                → 250.00 (10%)
              </code>
            </div>

            <div className="glass-card">
              <h4 className="font-semibold text-gray-900 mb-2">ABN Formatting</h4>
              <code className="text-sm text-primary-600">
                formatABN('12345678901')<br />
                → "12 345 678 901"
              </code>
            </div>

            <div className="glass-card">
              <h4 className="font-semibold text-gray-900 mb-2">Address Formatting</h4>
              <code className="text-sm text-primary-600">
                formatAustralianAddress(...)<br />
                → "42 Queen St, Brisbane QLD 4000"
              </code>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
