import { useState } from 'react';
import { ChevronRight, ArrowLeft } from 'lucide-react';

export function VenueApplication({ onNavigate }: any) {
  const [step, setStep] = useState<1 | 2>(1);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    venueName: '', address: '', city: '', contactName: '', contactEmail: '', phoneNumber: '',
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      await fetch('/api/venue-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_name: formData.venueName,
          address: formData.address,
          city: formData.city,
          contact_name: formData.contactName,
          contact_email: formData.contactEmail,
          phone_number: formData.phoneNumber,
        }),
      });
      setSubmitted(true);
    } catch (e) { console.error(e); }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[var(--text)] mb-4">Application Received!</h1>
          <button onClick={() => onNavigate?.('home')} className="px-8 py-3 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg">Return Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 px-4 py-16">
        <h1 className="text-4xl font-bold text-[var(--accent-contrast)]">Apply to Host</h1>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-16">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div><input type="text" value={formData.venueName} onChange={(e) => setFormData({...formData, venueName: e.target.value})} placeholder="Venue Name" required className="w-full px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]" /></div>
          <div><input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Address" required className="w-full px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]" /></div>
          <div><input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} placeholder="City" required className="w-full px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]" /></div>
          <div><input type="text" value={formData.contactName} onChange={(e) => setFormData({...formData, contactName: e.target.value})} placeholder="Contact Name" required className="w-full px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]" /></div>
          <div><input type="email" value={formData.contactEmail} onChange={(e) => setFormData({...formData, contactEmail: e.target.value})} placeholder="Email" required className="w-full px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]" /></div>
          <div><input type="tel" value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} placeholder="Phone" required className="w-full px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]" /></div>
          <button type="submit" className="w-full px-6 py-3 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-medium">Submit</button>
        </form>
      </div>
    </div>
  );
}
