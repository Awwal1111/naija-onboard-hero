// Shared heuristic to hide freelancer self-promo (gigs posted as jobs)
// from job listings & job-matching surfaces. Pure function; zero egress.
export function looksLikeGigOffer(job: { title?: string | null; description?: string | null }): boolean {
  const title = (job?.title || '').toLowerCase().trim();
  const desc = (job?.description || '').toLowerCase().trim();
  const text = `${title} ${desc}`.trim();
  if (!text) return false;

  // Strong signals in the description
  const offerPhrases = [
    'i can ', 'i will ', "i'll ", 'i make ', 'i build ', 'i design ',
    'i develop ', 'i create ', 'i offer ', 'i am a ', "i'm a ",
    'we create ', 'we design ', 'we build ', 'we develop ', 'we offer ',
    'we provide ', 'we specialize', 'specializes in ', 'specialising in ',
    'our services', 'my services', 'my portfolio', 'my skills include',
    'hire me', 'contact me', 'dm me', 'message me for', 'whatsapp me',
    'available for hire', 'open for work', 'open to work',
    'reach out to me', 'let’s work', "let's work",
  ];
  if (offerPhrases.some(p => text.includes(p))) return true;

  // Title-shape signal: bare role labels used as "I am a X" ads
  // e.g. "Logo designer", "Graphic designer", "Video editor"
  const bareRoleTitle = /^[a-z ,&/-]{4,40}(designer|developer|editor|writer|artist|marketer|manager|animator|photographer)s?$/i;
  if (bareRoleTitle.test(title) && !/(need|needed|wanted|hiring|looking for|seeking|urgent|required)/i.test(title)) {
    return true;
  }

  return false;
}
