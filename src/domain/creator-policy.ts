export interface CreatorCategory {
  name: string
  specializations: Array<{ name: string; professional: boolean }>
}

export const creatorCategories: CreatorCategory[] = [
  { name: 'Fashion & Beauty', specializations: [
    { name: 'Fashion', professional: false }, { name: 'Beauty', professional: false }, { name: 'Makeup Artist', professional: false },
  ] },
  { name: 'Media & Entertainment', specializations: [
    { name: 'Actor/Actress', professional: false }, { name: 'Comedy', professional: false }, { name: 'Musician', professional: false },
  ] },
  { name: 'Content & Digital Media', specializations: [
    { name: 'Content Creator', professional: false }, { name: 'Video Creator', professional: false }, { name: 'UGC Creator', professional: false }, { name: 'Photographer', professional: false },
  ] },
  { name: 'Business & Finance', specializations: [
    { name: 'Business Content Creator', professional: false }, { name: 'Finance Creator', professional: false }, { name: 'Legal Consultation', professional: true },
  ] },
  { name: 'Health & Wellness', specializations: [
    { name: 'Fitness', professional: false }, { name: 'Healthcare', professional: true }, { name: 'Medical', professional: true }, { name: 'Doctor', professional: true }, { name: 'Nutritionist/Dietician', professional: true }, { name: 'Counselor/Therapist', professional: true },
  ] },
  { name: 'Design, Art & Tech', specializations: [
    { name: 'Graphic Designer', professional: false }, { name: 'Digital Artist', professional: false }, { name: 'Tech Influencer', professional: false },
  ] },
  { name: 'Lifestyle & Family', specializations: [
    { name: 'Lifestyle', professional: false }, { name: 'Parent Influencer', professional: false }, { name: 'Travel Vlogger', professional: false },
  ] },
]

export function requiresProfessionalVerification(specialization: string) {
  return creatorCategories.flatMap((category) => category.specializations).some((item) => item.name === specialization && item.professional)
}
