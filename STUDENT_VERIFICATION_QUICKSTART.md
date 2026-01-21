# 🎓 Student Verification System - Quick Start

## What's New

Artists can now:
- ✅ Mark themselves as students (optional)
- ✅ Specify pronouns (optional)
- ✅ Search and select their school/university
- ✅ Get verified as a student
- ✅ Access exclusive student discounts

## Deploy in 5 Steps

### 1️⃣ Run Database Migration (2 min)
Open Supabase SQL Editor and copy-paste this file:
```
supabase/migrations/20260120_add_student_fields.sql
```

**What it does**:
- Adds 9 new columns to `artists` table
- Creates `schools` table with 100+ verified schools
- Creates `student_verifications` audit table
- Sets up proper indexes

### 2️⃣ Deploy Code Changes (5 min)
Merge and deploy these files:
- `src/components/artist/ArtistProfile.tsx` (updated)
- `src/components/artist/StudentDiscount.tsx` (new)
- `src/components/shared/SchoolSearch.tsx` (new)
- `src/lib/profileCompleteness.ts` (updated)
- `worker/index.ts` (updated)

### 3️⃣ Test in Development (5 min)
1. Login as artist
2. Go to "Artist Profile"
3. Scroll to "Student Profile" section
4. Check "I am a student"
5. Search for "Stanford" in School field
6. Select it and save
7. Go to "Student Benefits" page
8. See discounts listed

### 4️⃣ Deploy to Production
Use your standard deployment process (git, CI/CD, etc.)

### 5️⃣ Monitor
Track these metrics:
- Students registered: `SELECT COUNT(*) FROM artists WHERE is_student = true`
- Verified students: `SELECT COUNT(*) FROM artists WHERE is_student_verified = true`
- Active discounts: `SELECT COUNT(*) FROM artists WHERE student_discount_active = true`

## How It Works for Artists

### For Free Tier Artists
```
Mark as Student → Select School → Auto-Verified → Claim Free Starter Plan
```

### For Paid Tier Artists
```
Mark as Student → Select School → Auto-Verified → Apply 25-30% Discount
```

## How It Works Behind the Scenes

### Automatic Verification (Instant)
If school has email_domain (e.g., @stanford.edu):
- ✓ Immediately verified
- ✓ Student discount activated
- ✓ No admin needed

### Manual Verification (1-2 days)
If school doesn't have email domain:
- ⏳ Pending admin review
- ⏳ Status shows "Verification Pending"
- ✓ Once approved: discount activates

## API Endpoints

### Create Verification
```
POST /api/students/verify
Body: { "schoolId": "uuid" }
Response: { "success": true, "message": "..." }
```

### Check Status
```
GET /api/students/status
Response: { "isStudent": true, "isVerified": true, ... }
```

### Apply Discount
```
POST /api/students/discount
Response: { "success": true, "newTier": "starter" }
```

## Supported Schools (Initial List)

**US Universities:**
- MIT, Stanford, UC Berkeley, University of Chicago, NYU

**Art Schools:**
- RISD, SAIC, Parsons, CalArts, Pratt

**International:**
- Central Saint Martins, Royal College of Art

**Adding More Schools**:
```sql
INSERT INTO schools (name, type, country, city, state, verified, email_domain)
VALUES ('Your School', 'university', 'United States', 'City', 'State', true, 'school.edu');
```

## Pricing with Student Discounts

| Plan | Regular | With Student Discount |
|------|---------|----------------------|
| Free | Free | Free (+ free claim to Starter) |
| Starter | $79/mo | Free (for new students) |
| Growth | $149/mo | $99/mo (-30%) |
| Pro | $599/mo | $449/mo (-25%) |

## Database Schema Changes

### New Columns on `artists` Table
```
is_student                  BOOLEAN DEFAULT false
pronouns                    TEXT
school_id                   UUID (foreign key)
school_name                 TEXT
is_student_verified         BOOLEAN DEFAULT false
student_verification_token  TEXT
student_verification_expires_at TIMESTAMPTZ
student_discount_active     BOOLEAN DEFAULT false
student_discount_applied_at TIMESTAMPTZ
```

### New Tables
- `schools`: 100+ verified institutions
- `student_verifications`: Audit trail of verifications

## Files Changed

### New Files (3)
- `src/components/shared/SchoolSearch.tsx` - School picker component
- `src/components/artist/StudentDiscount.tsx` - Benefits dashboard
- `supabase/migrations/20260120_add_student_fields.sql` - Database migration

### Updated Files (4)
- `src/components/artist/ArtistProfile.tsx` - Added student fields
- `src/lib/profileCompleteness.ts` - Added student interface
- `worker/index.ts` - Added 3 new API endpoints
- `STUDENT_VERIFICATION_COMPLETE.md` - Full documentation

## Common Questions

**Q: Do students need to verify their email domain?**
A: Only if their school has one. If not, admin review is required.

**Q: When do discounts expire?**
A: After 1 year from verification date. Auto-renewals not yet implemented.

**Q: Can artists change their pronouns?**
A: Yes, anytime by editing their profile.

**Q: What if a school isn't in our system?**
A: Admin can add it via: `INSERT INTO schools...` query

**Q: Are discounts stackable?**
A: No, only one student discount per artist.

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| School search empty | Run migration (step 1) |
| "Unauthorized" error | Check Bearer token in API calls |
| Changes not showing | Clear cache and refresh |
| Discount not applying | Verify is_student_verified = true |

## Next Steps

1. ✅ Run migration
2. ✅ Deploy code
3. ✅ Test one artist account
4. ✅ Monitor adoption
5. ✅ Consider email campaign to students

---

**Ready to go!** Contact support if you hit any issues.

Last Updated: January 20, 2026
