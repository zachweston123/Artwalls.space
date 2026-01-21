/**
 * Profile Completeness Calculator
 * Helps artists understand what's needed for a complete, sales-ready profile
 */

export interface ArtistProfile {
  name?: string;
  email?: string;
  profilePhoto?: string;
  bio?: string;
  artTypes?: string[];
  phone?: string;
  primaryCity?: string;
  secondaryCity?: string;
  portfolioUrl?: string;
  instagramHandle?: string;
  isStudent?: boolean;
  pronouns?: string;
  schoolName?: string;
}

export interface ProfileCompleteness {
  percentage: number;
  completed: string[];
  missing: string[];
  nextStep?: string;
  recommendations: string[];
  isComplete: boolean;
}

export function calculateProfileCompleteness(profile: ArtistProfile): ProfileCompleteness {
  const completed: string[] = [];
  const missing: string[] = [];
  const recommendations: string[] = [];

  // Check each field with business importance
  if (profile.name && profile.name.trim().length > 0) {
    completed.push('name');
  } else {
    missing.push('name');
    recommendations.push('Add your full name to your profile');
  }

  if (profile.profilePhoto) {
    completed.push('photo');
  } else {
    missing.push('photo');
    recommendations.push('Upload a professional profile photo to increase recognition');
  }

  if (profile.bio && profile.bio.trim().length >= 50) {
    completed.push('bio');
  } else if (profile.bio && profile.bio.trim().length > 0) {
    missing.push('bio');
    recommendations.push('Expand your bio to at least 50 characters to tell your story');
  } else {
    missing.push('bio');
    recommendations.push('Write a compelling bio about your artistic vision and style');
  }

  if (profile.artTypes && profile.artTypes.length > 0) {
    completed.push('artTypes');
  } else {
    missing.push('artTypes');
    recommendations.push('Select your art types so venues can find you more easily');
  }

  if (profile.primaryCity && profile.primaryCity.trim().length > 0) {
    completed.push('location');
  } else {
    missing.push('location');
    recommendations.push('Set your primary city so venues can find local artists');
  }

  if (profile.phone && profile.phone.trim().length > 0) {
    completed.push('phone');
  } else {
    missing.push('phone');
    recommendations.push('Add a phone number for venue communications');
  }

  if (profile.portfolioUrl && profile.portfolioUrl.trim().length > 0) {
    completed.push('portfolio');
  } else {
    missing.push('portfolio');
    recommendations.push('Link to your portfolio or personal website');
  }

  if (profile.instagramHandle && profile.instagramHandle.trim().length > 0) {
    completed.push('social');
  } else {
    missing.push('social');
    recommendations.push('Add your Instagram handle to showcase more work');
  }

  const maxFields = 8; // Total possible fields
  const percentage = Math.round((completed.length / maxFields) * 100);

  // Determine next step based on priority
  let nextStep: string | undefined;
  if (missing.includes('photo')) nextStep = 'Upload a profile photo';
  else if (missing.includes('bio')) nextStep = 'Write your bio';
  else if (missing.includes('artTypes')) nextStep = 'Select your art types';
  else if (missing.includes('location')) nextStep = 'Set your location';
  else nextStep = 'Add portfolio or social media';

  return {
    percentage,
    completed,
    missing,
    nextStep,
    recommendations,
    isComplete: percentage === 100,
  };
}

/**
 * Get profile completeness level (beginner, intermediate, advanced, complete)
 */
export function getProfileLevel(percentage: number): 'beginner' | 'intermediate' | 'advanced' | 'complete' {
  if (percentage === 100) return 'complete';
  if (percentage >= 75) return 'advanced';
  if (percentage >= 50) return 'intermediate';
  return 'beginner';
}

/**
 * Get sales impact messaging based on completeness
 */
export function getSalesImpactMessage(level: string): string {
  const messages: Record<string, string> = {
    beginner: '🚀 Get started by adding your profile details to help venues discover you',
    intermediate: '📈 You\'re on the right track! Complete more fields to boost visibility',
    advanced: '⭐ Almost there! A complete profile significantly increases sales opportunities',
    complete: '✨ Your profile is complete and optimized for sales!',
  };
  return messages[level] || messages.beginner;
}

/**
 * Get color for profile completeness badge
 */
export function getCompletionColor(percentage: number): string {
  if (percentage === 100) return 'text-[var(--green)]';
  if (percentage >= 75) return 'text-[var(--blue)]';
  if (percentage >= 50) return 'text-[var(--accent)]';
  return 'text-[var(--text-muted)]';
}

/**
 * Get background color for profile completeness bar
 */
export function getCompletionBgColor(percentage: number): string {
  if (percentage === 100) return 'bg-[var(--green)]';
  if (percentage >= 75) return 'bg-[var(--blue)]';
  if (percentage >= 50) return 'bg-[var(--accent)]';
  return 'bg-[var(--text-muted)]';
}
