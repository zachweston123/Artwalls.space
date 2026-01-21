import { useEffect, useState } from 'react';
import { GraduationCap, CheckCircle, AlertCircle, Zap, Gift, Clock } from 'lucide-react';
import { apiGet, apiPost } from '../../lib/api';

interface StudentBenefits {
  isStudent: boolean;
  isVerified: boolean;
  discountActive: boolean;
  school?: {
    id: string;
    name: string;
  };
  verifications?: any[];
}

interface StudentDiscountProps {
  onNavigate: (page: string) => void;
}

export function StudentDiscount({ onNavigate }: StudentDiscountProps) {
  const [benefits, setBenefits] = useState<StudentBenefits | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadStudentStatus();
  }, []);

  async function loadStudentStatus() {
    try {
      setLoading(true);
      const data = await apiGet<StudentBenefits>('/api/students/status');
      setBenefits(data);
    } catch (err: any) {
      console.error('Failed to load student status:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyDiscount() {
    try {
      setApplying(true);
      setError(null);
      setSuccess(null);
      
      const result = await apiPost('/api/students/discount', {});
      setSuccess(result.message || 'Student discount applied!');
      
      // Reload status
      setTimeout(() => loadStudentStatus(), 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to apply discount');
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[var(--text-muted)]">Loading student benefits...</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap className="w-8 h-8 text-[var(--blue)]" />
          <h1 className="text-3xl">Student Benefits</h1>
        </div>
        <p className="text-[var(--text-muted)]">
          {benefits?.isStudent
            ? 'Exclusive discounts and benefits for verified students'
            : 'Unlock student benefits by verifying your school status'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-[var(--green)]/10 border border-[var(--green)]/30 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-[var(--green)] mt-0.5 flex-shrink-0" />
          <p className="text-[var(--green)]">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Status */}
        <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-lg font-medium mb-4 text-[var(--text)]">Your Status</h2>
          
          <div className="space-y-4">
            {/* Student Status */}
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  benefits?.isStudent
                    ? 'bg-[var(--blue)]/10 text-[var(--blue)]'
                    : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                }`}
              >
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-[var(--text)]">Student Status</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {benefits?.isStudent ? 'Active' : 'Not enrolled'}
                </p>
              </div>
            </div>

            {/* Verification Status */}
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  benefits?.isVerified
                    ? 'bg-[var(--green)]/10 text-[var(--green)]'
                    : benefits?.isStudent
                      ? 'bg-[var(--yellow)]/10 text-[var(--yellow)]'
                      : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-[var(--text)]">Verification</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {benefits?.isVerified
                    ? 'Verified ✓'
                    : benefits?.isStudent
                      ? 'Pending'
                      : 'Not started'}
                </p>
              </div>
            </div>

            {/* Discount Status */}
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  benefits?.discountActive
                    ? 'bg-[var(--green)]/10 text-[var(--green)]'
                    : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                }`}
              >
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-[var(--text)]">Student Discount</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {benefits?.discountActive ? 'Active ✓' : 'Not active'}
                </p>
              </div>
            </div>

            {/* School */}
            {benefits?.school && (
              <div className="pt-4 border-t border-[var(--border)]">
                <p className="text-sm text-[var(--text-muted)] mb-1">School/University</p>
                <p className="font-medium text-[var(--text)]">{benefits.school.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Available Benefits */}
        <div className="lg:col-span-2 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-lg font-medium mb-4 text-[var(--text)]">Student Benefits</h2>

          <div className="space-y-4">
            {/* Starter Tier Upgrade */}
            <div className="p-4 bg-[var(--blue)]/5 border border-[var(--blue)]/20 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[var(--blue)]" />
                  <h3 className="font-medium text-[var(--text)]">Free Starter Plan</h3>
                </div>
                {benefits?.isVerified && (
                  <span className="px-2 py-1 bg-[var(--green)]/10 text-[var(--green)] text-xs rounded-full">
                    Unlocked
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-3">
                Get started with our Starter plan features at no cost
              </p>
              <ul className="text-sm text-[var(--text-muted)] space-y-1 mb-3">
                <li>✓ Unlimited profile customization</li>
                <li>✓ Portfolio showcase (up to 50 pieces)</li>
                <li>✓ Direct venue contact</li>
                <li>✓ Sales analytics dashboard</li>
              </ul>
              {benefits?.isVerified && !benefits?.discountActive && (
                <button
                  onClick={handleApplyDiscount}
                  disabled={applying}
                  className="w-full px-3 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:brightness-95 transition-all disabled:opacity-60 font-medium"
                >
                  {applying ? 'Applying...' : 'Claim Starter Plan'}
                </button>
              )}
              {benefits?.discountActive && (
                <p className="text-sm text-[var(--green)] font-medium">
                  ✓ Starter plan active
                </p>
              )}
            </div>

            {/* Growth Plan Discount */}
            <div className="p-4 bg-[var(--green)]/5 border border-[var(--green)]/20 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-[var(--green)]" />
                  <h3 className="font-medium text-[var(--text)]">Growth Plan - 30% Off</h3>
                </div>
                {benefits?.isVerified && (
                  <span className="px-2 py-1 bg-[var(--green)]/10 text-[var(--green)] text-xs rounded-full">
                    Available
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-3">
                Unlock advanced features with a student discount
              </p>
              <ul className="text-sm text-[var(--text-muted)] space-y-1 mb-3">
                <li>✓ All Starter features</li>
                <li>✓ Portfolio showcase (unlimited)</li>
                <li>✓ Priority venue matching</li>
                <li>✓ Advanced analytics</li>
                <li>✓ Marketing tools</li>
              </ul>
              <p className="text-sm font-medium text-[var(--green)]">
                Just $99/month (normally $149) - 30% student discount
              </p>
            </div>

            {/* Pro Plan Discount */}
            <div className="p-4 bg-[var(--blue)]/5 border border-[var(--blue)]/20 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[var(--blue)]" />
                  <h3 className="font-medium text-[var(--text)]">Pro Plan - 25% Off</h3>
                </div>
                {benefits?.isVerified && (
                  <span className="px-2 py-1 bg-[var(--blue)]/10 text-[var(--blue)] text-xs rounded-full">
                    Available
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-3">
                Everything you need to scale your art business
              </p>
              <ul className="text-sm text-[var(--text-muted)] space-y-1 mb-3">
                <li>✓ All Growth features</li>
                <li>✓ Dedicated account manager</li>
                <li>✓ Custom commission tracking</li>
                <li>✓ API access</li>
                <li>✓ White-label options</li>
              </ul>
              <p className="text-sm font-medium text-[var(--blue)]">
                Just $449/month (normally $599) - 25% student discount
              </p>
            </div>

            {/* Verification Required */}
            {!benefits?.isStudent && (
              <div className="p-4 bg-[var(--yellow)]/5 border border-[var(--yellow)]/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[var(--yellow)] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-[var(--text)] mb-1">Not a Student Yet?</p>
                  <p className="text-sm text-[var(--text-muted)] mb-3">
                    Update your profile to mark yourself as a student and select your school
                  </p>
                  <button
                    onClick={() => onNavigate('artist-profile')}
                    className="text-sm px-3 py-1 bg-[var(--yellow)]/10 text-[var(--yellow)] rounded hover:bg-[var(--yellow)]/20 transition-colors font-medium"
                  >
                    Complete Profile
                  </button>
                </div>
              </div>
            )}

            {benefits?.isStudent && !benefits?.isVerified && (
              <div className="p-4 bg-[var(--yellow)]/5 border border-[var(--yellow)]/20 rounded-lg flex items-start gap-3">
                <Clock className="w-5 h-5 text-[var(--yellow)] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-[var(--text)] mb-1">Verification Pending</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    We're verifying your student status with {benefits.school?.name}. This typically takes 1-2 business days.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-8 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
        <h2 className="text-lg font-medium mb-6 text-[var(--text)]">How It Works</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="w-8 h-8 bg-[var(--blue)] text-[var(--on-blue)] rounded-full flex items-center justify-center font-bold mb-3">
              1
            </div>
            <h3 className="font-medium text-[var(--text)] mb-2">Mark as Student</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Go to your profile and check "I am a student"
            </p>
          </div>

          <div>
            <div className="w-8 h-8 bg-[var(--blue)] text-[var(--on-blue)] rounded-full flex items-center justify-center font-bold mb-3">
              2
            </div>
            <h3 className="font-medium text-[var(--text)] mb-2">Select Your School</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Search and select your school/university
            </p>
          </div>

          <div>
            <div className="w-8 h-8 bg-[var(--blue)] text-[var(--on-blue)] rounded-full flex items-center justify-center font-bold mb-3">
              3
            </div>
            <h3 className="font-medium text-[var(--text)] mb-2">Get Verified</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Automatic verification via school email domain or manual review
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-[var(--border)]">
          <h3 className="font-medium text-[var(--text)] mb-3">Verification Methods</h3>
          <ul className="space-y-2 text-sm text-[var(--text-muted)]">
            <li>
              <strong>Email Domain:</strong> If your school is in our verified list and uses an institutional email domain, you'll be verified instantly
            </li>
            <li>
              <strong>Manual Review:</strong> For schools not yet in our system, our team will review your enrollment documentation within 1-2 business days
            </li>
            <li>
              <strong>Expiration:</strong> Student discounts are valid for 1 year from verification date
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
