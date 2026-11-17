import { LegalPage } from "@/components/legal-page";
import { pageTitle } from "@/lib/i18n-server";

export const generateMetadata = pageTitle("Privacy policy");

// ሳይቱ የሚሰበስበውን ትክክለኛ መረጃ ይገልጻል (Google Play የሚጠይቀው)። #delete-account ለPlay Store የመለያ ማጥፊያ ሊንክ ነው።
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      draft={false}
      updated="Last updated: November 17, 2026"
      sections={[
        {
          heading: "Who we are",
          items: [
            "Ethio Computer (ethiocomputer.com and its app) is run by Ethio Computer School in Ethiopia.",
            "This policy explains what we collect, why, and the choices you have.",
          ],
        },
        {
          heading: "What we collect",
          items: [
            "Google sign-in details: your name, email address and profile photo.",
            "What you post: listings, account details, prices, screenshots and offers.",
            "Messages between buyers and sellers, including messages our filter blocked.",
            "Wallet records: deposits, receipt photos, transaction numbers, purchases, payouts and withdrawals.",
            "Seller verification: phone number, Fayda ID or passport number and photo, and bank account details.",
            "Technical data: sign-in sessions, IP address and browser or device type, used to keep your account secure.",
            "Questions you ask the AI help assistant. The chat stays in your browser and we don't store it.",
          ],
        },
        {
          heading: "Why we use it",
          items: [
            "To run the marketplace: show listings, handle offers and orders, and hold payment until handover.",
            "To verify sellers and prevent fraud, scams and contact sharing that breaks the chat rules.",
            "To check new listings, including an automatic AI check that compares screenshots with the listed numbers.",
            "To answer support questions and tell you about your orders.",
            "We don't sell your personal data and we don't use it for advertising.",
          ],
        },
        {
          heading: "Who we share it with",
          items: [
            "Other users see only what's needed: your seller name, your listings and the messages you send them. The account username is shown to the buyer after payment.",
            "Service providers that run the site for us: Vercel (hosting), Neon (database), Google (sign-in) and Anthropic (AI checks and the help assistant).",
            "Authorities, when Ethiopian law requires it or to protect users from fraud.",
            "ID documents and bank details are seen only by our admins.",
          ],
        },
        {
          heading: "How long we keep it",
          items: [
            "Account, listing and message data: while your account is open.",
            "Wallet and order records: as long as the law requires for financial records, even after the account is deleted.",
            "Verification documents: while you are a verified seller, and as long as needed to handle fraud reports.",
          ],
        },
        {
          heading: "How we protect it",
          items: [
            "Data is sent over HTTPS, and access is limited to the people who need it.",
            "Verification documents can only be opened by admins.",
            "We never ask for your passwords or login codes. Never share them with anyone.",
          ],
        },
        {
          heading: "Your rights",
          items: ["You can ask to see, correct or delete your personal data.", "You can stop using Ethio Computer at any time."],
        },
        {
          id: "delete-account",
          heading: "Delete your account",
          items: [
            "To delete your account, message us on Telegram @ethiocomputerschool or call 0924888899, and tell us the email you sign in with.",
            "Finish or cancel open orders and withdraw your wallet balance first.",
            "We delete your account and personal data within 30 days. Records the law requires us to keep, such as completed payments, are kept for that time and then deleted.",
          ],
        },
        {
          heading: "Children",
          items: ["Ethio Computer is for people 18 and older. We don't knowingly collect data from children."],
        },
        {
          heading: "Changes and contact",
          items: [
            "If we change this policy, we update the date at the top of this page.",
            "Questions: Telegram @ethiocomputerschool, phone 0924888899, or the Contact page.",
          ],
        },
      ]}
    />
  );
}
