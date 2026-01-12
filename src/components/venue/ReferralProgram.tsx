import { useState } from 'react';
import { Gift } from 'lucide-react';

export function ReferralProgram({ onNavigate }: any) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    referrerName: '', referrerEmail: '', venueName: '', venueCity: '', notes: '',
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_name: formData.venueName,
          venue_city: formData.venueCity,
          contact_name: formData.referrerName,
          contact_email: formData.referrerEmail,
          notes: formData.notes,
          status: 'pending',
        }),
      });
      setSubmitted(true);
    } catch (e) { console.error(e); }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <Gift className="w-16 h-16 text-[var(--accent)] mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-[var(--text)] mb-4">Referral Submitted!</h1>
          <button onClick={() => onNavigate?.('home')} className="px-8 py-3 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg">Return Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 px-4 py-16">
        <h1 className="text-4xl font-bold text-[var(--accent-contrast)]">Referral Program</h1>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-16">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div><input type="text" value={formData.referrerName} onChange={(e) => setFormData({...formData, referrerName: e.target.value})} placeholder="Your Name" required className="w-full px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]" /></div>
          <div><input type="email" value={formData.referrerEmail} onChange={(e) => setFormData({...formData, referrerEmail: e.target.value})} placeholder="Your Email" required className="w-full px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]" /></div>
          <div><input type="text" value={formData.venueName} onChange={(e) => setFormData({...formData, venueName: e.target.value})} placeholder="Venue Name" required className="w-full px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]" /></div>
          <div><input type="text" value={formData.venueCity} onChange={(e) => setFormData({...formData, venueCity: e.target.value})} placeholder="City" required className="w-full px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]" /></div>
          <button type="submit" className="w-full px-6 py-3 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-medium">Submit Referral</button>
        </form>
      </div>
    </div>
  );
}
