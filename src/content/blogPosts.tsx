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
  {
    slug: 'how-to-withdraw-earnings-naijalancers',
    title: 'How to Withdraw Your Earnings on NaijaLancers (Bank, Crypto & Mobile)',
    description:
      'Step-by-step guide to withdrawing NC earnings on NaijaLancers — Nigerian bank accounts, cUSD/USDT on Celo, and mobile money. Fees, limits, timing, and security tips.',
    keywords: 'naijalancers withdrawal, withdraw nc, cash out freelance nigeria, cUSD USDT celo, naira withdrawal nigeria',
    datePublished: '2026-06-04',
    dateModified: '2026-06-04',
    readTime: '8 min read',
    author: 'NaijaLancers Team',
    category: 'Payments & Security',
    body: (
      <>
        <p className="text-lg text-text-secondary leading-relaxed">
          Earning on a freelance platform only matters if you can actually move that money out. NaijaLancers gives you three reliable ways to cash out: directly to a Nigerian bank account in Naira, on-chain in cUSD or USDT on the Celo network, or to a mobile money wallet. This guide walks through every option, the fees, the timing, and how to keep your withdrawals safe.
        </p>

        <Section title="Understand what is withdrawable">
          <p>
            Your wallet shows two numbers: total NC balance and the withdrawable balance. Only completed earnings — gigs released from escrow, course sales, digital product sales, contest prizes, signed-off milestones — count as withdrawable. Money sitting in escrow against an active order, or pending milestone reviews, is shown separately and cannot be withdrawn until release.
          </p>
          <p>
            This split exists for a reason: it stops users from withdrawing money that may still need to be refunded, which is what keeps the marketplace honest for both buyers and sellers.
          </p>
        </Section>

        <Section title="Option 1: Withdraw to a Nigerian bank account (Naira)">
          <Sub title="When to use it">
            <p>Best for everyday cash-out. Funds arrive in your bank account as standard Naira and can be spent immediately with your debit card or transferred onward.</p>
          </Sub>
          <Sub title="How it works">
            <List
              items={[
                'Open Wallet → Withdraw → Bank account.',
                'Enter the amount in NC. The system shows you the live NGN equivalent and the fee.',
                'Select your saved bank and verify the account name returned by Quidax.',
                'Approve with your transaction PIN.',
                'A new tab opens to complete the ramp with Quidax — this is normal and keeps the transfer compliant.',
              ]}
            />
          </Sub>
          <Sub title="Timing & limits">
            <p>Most NGN withdrawals settle in under 10 minutes during banking hours and within an hour at night. Minimum withdrawal is NC 1,000 and the maximum per transaction depends on your verification tier.</p>
          </Sub>
        </Section>

        <Section title="Option 2: Withdraw to crypto (cUSD or USDT on Celo)">
          <Sub title="When to use it">
            <p>Best for international freelancers, anyone who wants to hold a stable USD-pegged asset, or developers integrating Celo dapps.</p>
          </Sub>
          <Sub title="How it works">
            <List
              items={[
                'Open Wallet → Withdraw → Crypto.',
                'Pick cUSD or USDT and paste a Celo-network address you control.',
                'Double-check the address. On-chain transfers cannot be reversed.',
                'Approve with your transaction PIN.',
                'You will receive a Celo transaction hash in your transaction history within seconds.',
              ]}
            />
          </Sub>
          <Sub title="Gas fees">
            <p>Celo gas is paid by the NaijaLancers relayer for routine withdrawals, so the only fee you see is the standard platform conversion spread. You do not need any CELO in your wallet to receive cUSD or USDT.</p>
          </Sub>
        </Section>

        <Section title="Option 3: Mobile money & internal transfers">
          <p>
            For small, fast movements you can also send NC instantly to another NaijaLancers user using their wallet tag or QR code. These transfers are free and settle immediately, which makes them useful for splitting bills, paying collaborators, or moving funds between your own accounts.
          </p>
        </Section>

        <Section title="Security checklist before you hit withdraw">
          <List
            items={[
              'Transaction PIN is set and not reused from any other app.',
              'Two-factor authentication is enabled.',
              'You initiated this withdrawal yourself — no one is screen-sharing or guiding you.',
              'The destination bank or wallet address belongs to you.',
              'You have completed at least photo-ID verification for larger amounts.',
            ]}
          />
        </Section>

        <Section title="What to do if something goes wrong">
          <p>
            Every withdrawal generates a reference ID in your transaction history. If a Naira transfer is delayed beyond an hour or a crypto withdrawal is missing after 10 minutes, open Help Center and submit a support ticket with that reference. Do not retry the withdrawal — duplicate requests slow down resolution.
          </p>
        </Section>
      </>
    ),
  },
  {
    slug: 'how-to-create-gig-that-sells-naijalancers',
    title: 'How to Create a Gig That Actually Sells on NaijaLancers',
    description:
      'A proven framework for writing a NaijaLancers gig that ranks, converts, and earns repeat clients. Title, pricing, packages, photos, and FAQs that work in 2026.',
    keywords: 'create gig naijalancers, freelance gig nigeria, gig conversion, sell on naijalancers, gig SEO',
    datePublished: '2026-06-04',
    dateModified: '2026-06-04',
    readTime: '10 min read',
    author: 'NaijaLancers Team',
    category: 'Freelance Growth',
    body: (
      <>
        <p className="text-lg text-text-secondary leading-relaxed">
          A great gig page does three jobs at once: it ranks in NaijaLancers search, it convinces a stranger to trust you in under sixty seconds, and it sets expectations so well that the order goes smoothly. This guide gives you the exact framework our top sellers use.
        </p>

        <Section title="1. Write a title buyers actually search for">
          <p>
            Your title is the single biggest ranking and click-through factor. Forget clever taglines. Write what the buyer would type into Google or the in-app search bar.
          </p>
          <List
            items={[
              'Bad: "Quality designs that wow."',
              'Good: "I will design a modern logo for your Nigerian business in 24 hours."',
              'Bad: "Web genius at your service."',
              'Good: "I will build a fast WordPress website with payment integration."',
            ]}
          />
          <p>Lead with the verb the buyer cares about — design, write, build, edit, fix — then the specific deliverable and a credibility hook (timeline, niche, or guarantee).</p>
        </Section>

        <Section title="2. Price with three packages, not one">
          <p>
            Single-price gigs leave money on the table. Buyers love comparing. Set up Basic, Standard, and Premium so the middle tier feels like the obvious choice. As a rule of thumb your Standard tier should be roughly twice the Basic, and Premium roughly twice the Standard. Add one extra meaningful deliverable per tier — not just "faster delivery."
          </p>
        </Section>

        <Section title="3. Photos and video do the heavy lifting">
          <p>
            The first photo is your billboard. Use a clean, high-contrast image with a short overlay describing what you sell. Add three to five additional photos that show real work samples, not stock graphics. If you can record a 30-second loom-style video explaining your service, do it — gigs with video convert 30–40% better.
          </p>
        </Section>

        <Section title="4. Write the description for the skeptical buyer">
          <p>
            Most buyers skim. Use short paragraphs, bullet points, and clear sections. Cover what they get, what you need from them, your process, and what is not included. Setting boundaries up front reduces revisions and disputes.
          </p>
        </Section>

        <Section title="5. Answer the top five FAQs">
          <p>
            FAQs convert browsers into buyers. Pre-empt the questions you keep getting in chat — turnaround time, revision policy, source files, commercial use, refunds — and add them directly to the gig FAQ section.
          </p>
        </Section>

        <Section title="6. Stack your trust signals">
          <List
            items={[
              'Complete verification at least to photo ID.',
              'Add a clear professional profile photo and a one-line headline.',
              'Pin your best portfolio items to your profile.',
              'Ask satisfied clients to leave a public review after the order completes.',
              'Reply to first messages in under an hour during the day.',
            ]}
          />
        </Section>

        <Section title="7. Iterate based on real data">
          <p>
            After two weeks, open the gig analytics. If impressions are high but clicks are low, your title or main photo is the bottleneck. If clicks are high but orders are low, the pricing or description is the bottleneck. Change one thing at a time so you can measure the effect.
          </p>
        </Section>

        <Section title="Bonus: get your first orders faster">
          <p>
            New gigs need a small reputation kickstart. Share your gig link with your existing network, post it in relevant Nigerian freelance communities, and consider offering the Basic tier at a slight discount for the first three orders in exchange for honest reviews. Once you have three reviews, demand snowballs.
          </p>
        </Section>
      </>
    ),
  },
  {
    slug: 'avoid-freelance-scams-nigeria',
    title: 'How to Avoid Freelance Scams in Nigeria (Buyer & Seller Edition)',
    description:
      'The most common freelance scams in Nigeria and exactly how to avoid them. Off-platform payments, advance-fee fraud, fake clients, and how NaijaLancers protects you.',
    keywords: 'freelance scam nigeria, naijalancers safety, advance fee fraud, off platform payment, freelance fraud',
    datePublished: '2026-06-04',
    dateModified: '2026-06-04',
    readTime: '8 min read',
    author: 'NaijaLancers Team',
    category: 'Trust & Safety',
    body: (
      <>
        <p className="text-lg text-text-secondary leading-relaxed">
          Most freelance fraud follows a small number of repeating patterns. Once you know what they look like, they become very easy to spot. This guide covers the scams Nigerian freelancers and buyers report most often and gives you concrete, in-app habits that shut each one down.
        </p>

        <Section title="The five scams you will actually see">
          <Sub title="1. The off-platform pivot">
            <p>
              A client messages, sounds friendly, then asks to "continue on WhatsApp" or "send to my Gmail" before any order is placed. The moment work moves off-platform, escrow disappears and so does any record of the agreement. This is the single most common way freelancers lose money.
            </p>
          </Sub>
          <Sub title="2. The advance-fee request">
            <p>
              "Pay a small NC fee to unlock the job," or "send me airtime to verify you." Real clients never ask freelancers to pay first. NaijaLancers will never ask you to pay to receive money.
            </p>
          </Sub>
          <Sub title="3. The overpayment trick">
            <p>
              A buyer offers to pay much more than the gig price, then asks you to "refund the excess" to a different account. The original payment is fake or will be reversed. The refund you send is gone.
            </p>
          </Sub>
          <Sub title="4. The fake-screenshot client">
            <p>
              They send a screenshot of a "bank transfer" or "wallet credit" and ask you to start work or release files. Screenshots are trivial to fake. Only trust what you see inside the NaijaLancers wallet itself.
            </p>
          </Sub>
          <Sub title="5. The free-sample fisher">
            <p>
              A "buyer" asks for a custom design, article, or code sample before placing the order, then disappears with the work. Limit free samples to existing portfolio links, never custom work.
            </p>
          </Sub>
        </Section>

        <Section title="The non-negotiable rules">
          <List
            items={[
              'Every order, every time, inside NaijaLancers. No exceptions.',
              'Do not start work until the order shows funds held in escrow.',
              'Never share your password, transaction PIN, two-factor code, or recovery phrase with anyone — including someone claiming to be support.',
              'Verify the wallet balance inside the app, not from screenshots.',
              'If something feels off, slow down. Real opportunities can wait an hour while you check.',
            ]}
          />
        </Section>

        <Section title="What NaijaLancers does for you in the background">
          <List
            items={[
              'Escrow on every gig order so funds are held until you both agree.',
              'Trust score and verification badges on every profile.',
              'IP-based fraud limits that block obvious multi-account farming.',
              'AI moderation on suspicious messages and listings.',
              '24-hour auto-approve windows so honest sellers always get paid.',
            ]}
          />
        </Section>

        <Section title="If you are scammed anyway">
          <p>
            Open the order, tap Dispute, and submit screenshots of every relevant message. Our dispute team can release funds, refund the buyer, or freeze the suspected account. The faster you report, the more we can recover.
          </p>
        </Section>
      </>
    ),
  },
  {
    slug: 'naijalancers-vs-fiverr-upwork-nigeria',
    title: 'NaijaLancers vs Fiverr vs Upwork: Which One Is Best for Nigerian Freelancers?',
    description:
      'Honest 2026 comparison of NaijaLancers, Fiverr, and Upwork for freelancers in Nigeria — fees, payouts, account holds, escrow, and which platform pays out faster.',
    keywords: 'naijalancers vs fiverr, upwork nigeria, best freelance platform nigeria, fiverr fees, upwork fees',
    datePublished: '2026-06-04',
    dateModified: '2026-06-04',
    readTime: '9 min read',
    author: 'NaijaLancers Team',
    category: 'Freelance Growth',
    body: (
      <>
        <p className="text-lg text-text-secondary leading-relaxed">
          Choosing where to freelance is one of the most important business decisions a Nigerian freelancer makes. Fees, payout speed, account stability, and dispute fairness compound across hundreds of orders. Here is an honest comparison of the three options most freelancers actually consider.
        </p>

        <Section title="Platform fees">
          <List
            items={[
              'NaijaLancers: 5% flat platform fee on gigs, courses, and digital products.',
              'Fiverr: 20% on every order, every time.',
              'Upwork: 10% flat as of 2023 — better than the old sliding scale, but still double NaijaLancers.',
            ]}
          />
          <p>On a NC 100,000 order you keep NC 95,000 on NaijaLancers, NC 80,000 on Fiverr, and NC 90,000 on Upwork. Multiply that by a year of work.</p>
        </Section>

        <Section title="Payout speed in Nigeria">
          <List
            items={[
              'NaijaLancers: Naira to your bank in under 10 minutes during banking hours. cUSD/USDT on Celo in seconds.',
              'Fiverr: 14-day clearance, then Payoneer/PayPal transfer that can take 1–3 business days.',
              'Upwork: Similar clearance windows, plus international wire delays.',
            ]}
          />
        </Section>

        <Section title="Account stability">
          <p>
            Nigerian freelancers consistently report account freezes and "review periods" on the international platforms — sometimes after a single dispute. NaijaLancers is built and operated for Nigeria, with local KYC, local support, and Naira-native rails, so accounts do not get caught in geo-block dragnets.
          </p>
        </Section>

        <Section title="Buyer pool">
          <p>
            This is the honest counter-argument. Fiverr and Upwork have a larger international buyer pool. NaijaLancers is growing fast inside Nigeria and across Africa, and has the advantage that buyers and sellers share the same payment rails, so transactions actually settle.
          </p>
          <p>
            The pragmatic answer for most freelancers is "run both." Use the international platforms to fish for foreign clients. Use NaijaLancers for higher-margin work, repeat clients, local clients, and fast cash-out.
          </p>
        </Section>

        <Section title="Dispute fairness">
          <p>
            On Fiverr and Upwork the dispute team is global and often follows the buyer-friendly default. NaijaLancers uses chat transcripts plus order milestones to make decisions, and you can escalate to a human reviewer who actually understands the Nigerian context.
          </p>
        </Section>

        <Section title="The bottom line">
          <List
            items={[
              'Lower fees: NaijaLancers wins by 2–4x.',
              'Faster payouts in Naira: NaijaLancers wins outright.',
              'Account stability for Nigerian users: NaijaLancers wins.',
              'Raw size of international buyer pool: Fiverr/Upwork win.',
              'Best strategy: build your base on NaijaLancers, use the others as a top-of-funnel.',
            ]}
          />
        </Section>
      </>
    ),
  },
  {
    slug: 'freelance-tax-nigeria-guide',
    title: 'Freelance Taxes in Nigeria: A Simple Guide for NaijaLancers Earners',
    description:
      'Understand how Personal Income Tax, VAT, and the new digital-services rules apply to Nigerian freelancers in 2026. Records, deductions, and how to stay compliant.',
    keywords: 'freelance tax nigeria, naijalancers tax, personal income tax nigeria, vat freelance, FIRS digital tax',
    datePublished: '2026-06-04',
    dateModified: '2026-06-04',
    readTime: '8 min read',
    author: 'NaijaLancers Team',
    category: 'Business & Money',
    body: (
      <>
        <p className="text-lg text-text-secondary leading-relaxed">
          Tax is the part of freelancing nobody likes to think about — until a letter shows up. This guide is a plain-English overview of how Nigerian tax law applies to freelance income you earn on NaijaLancers in 2026. It is informational, not legal advice; for anything large, consult a registered tax practitioner.
        </p>

        <Section title="The taxes that may apply to you">
          <Sub title="Personal Income Tax (PIT)">
            <p>
              Freelance earnings are personal income. Nigerian residents are taxed on a progressive scale administered by the State Internal Revenue Service of the state you live in (LIRS in Lagos, FCT-IRS in Abuja, and so on). Rates currently range from 7% on the first band to 24% on the top band, with a Consolidated Relief Allowance that reduces the taxable base.
            </p>
          </Sub>
          <Sub title="Value Added Tax (VAT)">
            <p>
              VAT in Nigeria is 7.5%. Most micro-freelancers fall under the small-business VAT exemption (annual turnover below the FIRS threshold), but if you are scaling and crossing that threshold you will need to register for VAT and charge it on invoices.
            </p>
          </Sub>
          <Sub title="Withholding tax on services">
            <p>
              Corporate clients in Nigeria are required to withhold a percentage on professional service payments and remit it to FIRS. If a client deducts WHT, ask for the receipt — you can claim it as a credit against your PIT.
            </p>
          </Sub>
        </Section>

        <Section title="Keep clean records — your future self will thank you">
          <List
            items={[
              'Download your NaijaLancers transaction history monthly. The app exports a clean CSV.',
              'Track expenses: data, electricity, software subscriptions, equipment, training, transport for client meetings.',
              'Keep digital copies of every invoice, receipt, and bank statement for at least six years.',
              'Separate a freelance-only bank account so personal and business income do not mix.',
            ]}
          />
        </Section>

        <Section title="Deductions to remember">
          <p>
            You can deduct allowable business expenses before computing taxable income. For most freelancers that includes internet bills, a reasonable portion of rent or electricity if you work from home, professional software, training courses, and equipment depreciation. Keep receipts; the SIRS or FIRS can ask.
          </p>
        </Section>

        <Section title="How to file (the short version)">
          <List
            items={[
              'Register with your State Internal Revenue Service and obtain a Taxpayer Identification Number (TIN).',
              'File your annual Form A by 31 March each year covering the prior calendar year.',
              'Pay any balance due. If you expect a large bill, pay quarterly Provisional Tax to avoid a year-end shock.',
              'Keep proof of payment — many corporate clients will ask for tax clearance before bigger contracts.',
            ]}
          />
        </Section>

        <Section title="Crypto withdrawals">
          <p>
            If you cash out earnings in cUSD or USDT, the moment you convert to Naira (or use them to buy something) is the realisation event most relevant for tax. Track conversion rates on the day you swap so you can compute the Naira-equivalent income cleanly.
          </p>
        </Section>

        <Section title="A simple monthly rhythm">
          <List
            items={[
              '1st of the month: export last month\'s NaijaLancers transactions.',
              'Same day: log expenses into a spreadsheet or accounting app.',
              'Move 15–25% of net income into a separate tax-savings sub-account.',
              'Once a quarter: reconcile and, if eligible, pay provisional tax.',
            ]}
          />
          <p>That is it. Five minutes a week and one hour a quarter saves a stressful March every year.</p>
        </Section>
      </>
    ),
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
