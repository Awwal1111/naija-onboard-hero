import { ReactNode } from 'react';

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  keywords: string;
  datePublished: string;
  dateModified: string;
  readTime: string;
  author: string;
  category: string;
  body: ReactNode;
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mt-10">
    <h2 className="text-2xl font-bold text-text-primary mb-3">{title}</h2>
    <div className="text-text-secondary leading-relaxed space-y-4">{children}</div>
  </section>
);

const Sub = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="mt-6">
    <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
    <div className="text-text-secondary leading-relaxed space-y-3">{children}</div>
  </div>
);

const List = ({ items }: { items: (string | ReactNode)[] }) => (
  <ul className="list-disc pl-6 space-y-2">
    {items.map((it, i) => (
      <li key={i}>{it}</li>
    ))}
  </ul>
);

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'complete-guide-secure-payments-naijalancers',
    title: 'A Complete Guide to Secure Payments on NaijaLancers',
    description:
      'Learn how NaijaLancers protects every freelance transaction in Nigeria with escrow, NC wallet, instant payouts, and dispute resolution. The complete 2026 payment guide.',
    keywords:
      'naijalancers payments, escrow nigeria, freelance payments nigeria, secure freelance, NC wallet, freelance escrow',
    datePublished: '2026-06-03',
    dateModified: '2026-06-03',
    readTime: '9 min read',
    author: 'NaijaLancers Team',
    category: 'Payments & Security',
    body: (
      <>
        <p className="text-lg text-text-secondary leading-relaxed">
          Getting paid — or paying someone — across the internet in Nigeria has historically been one of the biggest barriers to freelance work. Bank transfers can be reversed, P2P deals collapse over trust, and international platforms freeze accounts for opaque reasons. NaijaLancers was built to solve this with a payment stack that is fast, transparent, and protected by escrow on every transaction.
        </p>

        <Section title="Why secure payments matter for Nigerian freelancers">
          <p>
            Freelancing in Nigeria is booming. The country has one of the largest pools of remote talent in Africa, but most freelancers still report payment-related disputes as their number-one frustration. Clients ghost after delivery. Buyers complain after the fact and reverse the transfer. Foreign platforms hold balances for weeks. A secure payment layer fixes all three problems at once.
          </p>
          <p>
            On NaijaLancers, every order — whether it is a gig, a hire, a course, or a digital product — flows through our internal NC wallet and an automatic escrow. You never have to chase a client for payment, and as a buyer you never lose money to a seller who disappears.
          </p>
        </Section>

        <Section title="The four pillars of payment safety">
          <Sub title="1. NC — the platform currency">
            <p>
              NC (NaijaCoins) is the internal balance every account holds. 1 NC ≈ ₦1 and we publish dynamic equivalents in ten fiat currencies for global users. Topping up your NC wallet is the same as funding any modern fintech wallet: card, bank transfer, USSD, Naira ramp via Quidax, USDT via Pretium, or stable-coin via Mt. Pelerin.
            </p>
          </Sub>
          <Sub title="2. Escrow on every order">
            <p>
              The moment a buyer places an order, the NC is moved from their withdrawable balance into a locked escrow ledger. The seller sees a notification — “🎉 New gig order — NC 100,000 held in escrow” — and can begin work knowing the money exists. Funds are only released to the seller after delivery is approved.
            </p>
          </Sub>
          <Sub title="3. Transaction PIN on every spend">
            <p>
              Even with your phone unlocked, no NC ever leaves your wallet without a 4-digit transaction PIN. The PIN is hashed in our user-secrets table and never shown in any log. You can reset it from Settings → Security at any time.
            </p>
          </Sub>
          <Sub title="4. Dispute resolution">
            <p>
              If a delivery is late, incomplete, or off-brief, either side can raise a dispute. An admin reviews the chat, milestones, and uploaded proof and rules in 24–72 hours. Escrow only releases after the ruling.
            </p>
          </Sub>
        </Section>

        <Section title="What buyers actually see on checkout">
          <p>
            Before you tap “Pay”, the order screen shows the escrow shield clearly: <em>“Your payment is securely held in escrow until the work is completed. If the seller does not accept your order, you will receive a full refund.”</em> No fine print, no surprises.
          </p>
          <List
            items={[
              'You can cancel any order before the seller accepts it — instant 100% refund.',
              'After acceptance, cancellations are mutual or escalated to dispute.',
              'On approved delivery, NC is released to the seller minus a 5% platform fee.',
              'Sellers can withdraw NC instantly to Naira via Quidax or to USDT.',
            ]}
          />
        </Section>

        <Section title="How sellers receive money — and how fast">
          <p>
            Once a buyer approves the work, NC lands in the seller’s wallet within seconds. From there, withdrawal options include:
          </p>
          <List
            items={[
              'Naira via Quidax — same-day to any Nigerian bank.',
              'USDT (TRC-20 / Celo) — under 10 minutes on-chain.',
              'NC to NC transfer — instant, free, between any NaijaLancers users.',
              'Bill payments — airtime, data, cable TV, electricity directly from the wallet.',
            ]}
          />
        </Section>

        <Section title="Security under the hood">
          <p>
            All sensitive credentials — wallet keys, transaction PINs, OAuth tokens — sit in a separate <code>user_secrets</code> table with strict row-level security. Profile pictures, gig images, and resumes route through Catbox so we never burn database egress. The app enforces a three-channel realtime ceiling per user to keep performance smooth even on low-end Android devices.
          </p>
          <p>
            We also throttle signup by IP (max three accounts per 24 hours) to keep referral and reward systems clean, and every admin action is logged for audit.
          </p>
        </Section>

        <Section title="What this means for you">
          <p>
            Whether you’re hiring a logo designer in Kano or selling a Webflow site to a buyer in Lagos, NaijaLancers makes the payment side disappear into the background. You focus on the work — the platform handles the money. That is the entire point of escrow, and it’s why thousands of Nigerian freelancers now treat NaijaLancers as their default payments rail.
          </p>
        </Section>
      </>
    ),
  },
  {
    slug: 'how-escrow-protects-freelancers-and-clients',
    title: 'How Escrow Protects Freelancers and Clients on NaijaLancers',
    description:
      'A plain-English explanation of how escrow works on NaijaLancers — from the moment a buyer pays to the moment a freelancer gets paid. Covers refunds, disputes, milestones, and timelines.',
    keywords:
      'freelance escrow nigeria, how escrow works, naijalancers escrow, milestone payments, freelance dispute, safe freelance payments',
    datePublished: '2026-06-03',
    dateModified: '2026-06-03',
    readTime: '7 min read',
    author: 'NaijaLancers Team',
    category: 'Escrow & Trust',
    body: (
      <>
        <p className="text-lg text-text-secondary leading-relaxed">
          Escrow is the single most important reason both buyers and sellers feel safe on NaijaLancers. It removes the trust gap between two strangers on the internet by holding the money with a neutral third party — the platform — until the agreed work is complete.
        </p>

        <Section title="What is escrow, simply?">
          <p>
            Think of escrow like a locked safe that two people share but neither can open alone. The buyer drops money in. The seller can see it’s there. Once the seller delivers and the buyer approves, the safe opens and the money moves to the seller. If anything goes wrong, the safe stays locked and a referee decides what happens next.
          </p>
        </Section>

        <Section title="The NaijaLancers escrow flow, step by step">
          <Sub title="Step 1 — Buyer places an order">
            <p>
              The buyer picks a gig and confirms checkout with their transaction PIN. Instantly, NC equal to the gig price is moved from their <em>withdrawable</em> balance into a locked escrow ledger. They see the message: <em>“NC 100,000 held in escrow”</em>.
            </p>
          </Sub>
          <Sub title="Step 2 — Seller is notified">
            <p>
              The seller gets a Telegram ping, an in-app notification, an email digest entry, and (if subscribed) a web push. They can accept or decline. If they decline, the buyer is automatically refunded.
            </p>
          </Sub>
          <Sub title="Step 3 — Work happens">
            <p>
              The chat opens automatically with full context. Files, voice notes, milestones, and a built-in writing assistant make collaboration fast. The buyer can cancel anytime before acceptance for a full refund.
            </p>
          </Sub>
          <Sub title="Step 4 — Delivery and approval">
            <p>
              The seller marks the order as delivered with notes and attachments. The buyer reviews and either approves or requests a revision. On approval, escrow releases — the seller’s wallet credits within seconds and the buyer can leave a review.
            </p>
          </Sub>
          <Sub title="Step 5 — Disputes (if any)">
            <p>
              If buyer and seller cannot agree, either party clicks <em>Raise Dispute</em>. A NaijaLancers admin reads the full chat, attached deliverables, and milestone history, then rules in 24–72 hours. Until then, escrow stays locked.
            </p>
          </Sub>
        </Section>

        <Section title="Why this is better than bank transfer or P2P">
          <List
            items={[
              'No “I paid and they vanished” — the seller cannot start work without escrow being funded.',
              'No “I delivered and they refused to pay” — the money is already locked when work begins.',
              'No chargebacks — the buyer cannot reverse the transfer behind your back.',
              'No payment processor freezing balances for weeks like some international platforms.',
              'Full Naija context — built for Nigerian banks, Naira, USDT, and Telegram-first communication.',
            ]}
          />
        </Section>

        <Section title="Milestones — escrow for big projects">
          <p>
            For jobs and projects with multiple deliverables, milestones let the buyer fund stage by stage. Each milestone is its own little escrow. The seller is paid for milestone 1 before starting milestone 2, and the buyer never has to risk the whole budget up-front. This is the safest way to run any project above NC 50,000.
          </p>
        </Section>

        <Section title="Fees and timelines, in one place">
          <List
            items={[
              'Platform fee: 5% of every completed order — deducted from seller payout, never from buyer escrow.',
              'Escrow holding period: indefinite until both parties act (or 24h auto-approve after delivery if buyer is silent).',
              'Refund speed: instant on cancel-before-accept.',
              'Dispute SLA: 24–72 hours from filing to ruling.',
              'Withdrawal to Naira: same day via Quidax.',
            ]}
          />
        </Section>

        <Section title="Bottom line">
          <p>
            Escrow is invisible when everything goes well — and that’s the point. You hire, you work, you get paid. NaijaLancers does the holding, the releasing, the refunding, and the refereeing in the background, so you can focus on the actual job.
          </p>
        </Section>
      </>
    ),
  },
  {
    slug: 'how-to-hire-trusted-freelancers-in-nigeria',
    title: 'How to Hire Trusted Freelancers in Nigeria Using NaijaLancers',
    description:
      'The 2026 buyer’s playbook for hiring vetted Nigerian freelancers — how to read trust scores, use the AI hire assistant, fund escrow, and avoid scams.',
    keywords:
      'hire freelancers nigeria, hire designer lagos, trusted freelancers nigeria, naijalancers hire, ai hire assistant, find freelancer nigeria',
    datePublished: '2026-06-03',
    dateModified: '2026-06-03',
    readTime: '8 min read',
    author: 'NaijaLancers Team',
    category: 'Hiring Guide',
    body: (
      <>
        <p className="text-lg text-text-secondary leading-relaxed">
          Nigeria has world-class designers, developers, writers, marketers, and AI specialists. The hard part has always been finding the right one quickly — and trusting them with your budget. NaijaLancers compresses that entire process into a few taps. Here is exactly how to do it well.
        </p>

        <Section title="Start with the AI Hire Assistant">
          <p>
            Instead of scrolling through hundreds of profiles, open the AI Hire Assistant. It asks you three questions: <em>what skill do you need, what is your budget, and how soon do you need it</em>. It then returns a short list of freelancers matched by skill, availability, and verified trust score. It is the fastest path from need to shortlist on the platform.
          </p>
        </Section>

        <Section title="Read the trust score before anything else">
          <p>
            Every freelancer on NaijaLancers carries a dynamic trust score built from real signals — not vanity metrics. It blends:
          </p>
          <List
            items={[
              'Identity and KYC verification level (basic, photo ID, expert).',
              'Number of completed orders and average rating.',
              'On-time delivery rate.',
              'Connections and mutual chat confirmations from past clients.',
              'Account age and platform activity.',
            ]}
          />
          <p>
            If the trust score is green and you can see at least three completed orders with reviews, you are looking at someone the platform has already vetted in production.
          </p>
        </Section>

        <Section title="Use category filters that actually matter">
          <p>
            Filter by state and LGA if you need someone local for Nigerian-context work (Naira marketing, Lagos site visits, NYSC content, etc.). For global delivery — code, design, video — skip location and filter by skill and language only. NaijaLancers shows state/LGA filters dynamically only when relevant.
          </p>
        </Section>

        <Section title="Check the gig page before you message">
          <p>
            A good gig page tells you everything: clear scope, price, delivery time, FAQ, testimonials, and a portfolio with real work. Look for sellers who have written FAQs — it usually correlates with better communication. The escrow shield on the page confirms your payment will be protected when you order.
          </p>
        </Section>

        <Section title="Open with a short, specific brief">
          <p>
            The best inbound message in any Nigerian freelance marketplace looks like this:
          </p>
          <blockquote className="border-l-4 border-primary pl-4 italic text-text-primary">
            “Hi — I need a 1-page landing for my fintech startup in Tailwind + React. Budget NC 80,000, delivery in 5 days. Reference: [link]. Can you take it on?”
          </blockquote>
          <p>
            Specific brief, real budget, deadline, reference. Freelancers reply faster, and you avoid the time-wasting back-and-forth.
          </p>
        </Section>

        <Section title="Pay through escrow — never outside the platform">
          <p>
            This is the single most important rule. If anyone — buyer or seller — asks you to move payment to WhatsApp transfer or a bank account outside NaijaLancers, refuse. The platform’s entire protection layer disappears the moment money leaves escrow. We have zero recourse for off-platform deals, and reports show this is how almost every freelance scam in Nigeria starts.
          </p>
        </Section>

        <Section title="Use milestones for anything above NC 50,000">
          <p>
            Break the project into 2–4 milestones — wireframe, design, build, polish — and fund them one at a time. You stay in control of the budget and the freelancer stays motivated to ship on time.
          </p>
        </Section>

        <Section title="Leave honest reviews">
          <p>
            Reviews are how the next buyer decides whether to trust this freelancer. If the work was great, say so. If there were problems, write what happened factually. The system rewards good freelancers and quietly pushes the unreliable ones down the ranking — that is how the marketplace keeps quality high.
          </p>
        </Section>

        <Section title="A 60-second hiring checklist">
          <List
            items={[
              'Trust score is green and verification is at least photo ID.',
              'At least three completed orders with public reviews.',
              'Clear gig scope, price, and delivery time on the gig page.',
              'Replies to your first message in under 24 hours.',
              'Order placed and escrow funded inside NaijaLancers.',
              'Milestones used for any project above NC 50,000.',
            ]}
          />
          <p>
            Tick those six and your chances of a smooth hire are very, very high.
          </p>
        </Section>
      </>
    ),
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
