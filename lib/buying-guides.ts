// "እንዴት ይገዛል?" መመሪያዎች፦ በእያንዳንዱ ገበያ ገጽ ላይ ያለው ትንሽ አዝራር እነዚህን ደረጃዎች ያሳያል፣ ከታች ደግሞ ወዲያው መጀመሪያ አዝራር አለ።
// database አይጠቀምም፤ በclient ኮምፖነንቶችም ይሰራል።
import type { MessageKey } from "@/lib/messages";

export type GuideStep = { title: MessageKey; description: MessageKey };
/** href በ"#" ሲጀምር በዚያው ገጽ ያለ ክፍል ነው፤ external ሲሆን በአዲስ ትር ይከፈታል። */
export type GuideAction = { label: MessageKey; href: string; external?: boolean };
export type GuideSide = { tab: MessageKey; steps: GuideStep[]; action: GuideAction };
export type Guide = { title: MessageKey; buy: GuideSide; sell?: GuideSide };

const walletStep: GuideStep = {
  title: "Add money to your wallet",
  description: "Open Wallet, send the money by bank or Telebirr, and upload the receipt. An admin adds it to your balance, usually within minutes.",
};

export const guides = {
  accounts: {
    title: "How to buy and sell social media accounts",
    buy: {
      tab: "How to buy",
      steps: [
        { title: "Sign in", description: "Sign in with your Google account. It takes a few seconds." },
        { title: "Find an account", description: "Filter by platform, category, followers and price. Open an account to see its screenshots and details." },
        { title: "Ask the seller", description: "Use the chat on the account's page for any question. Never share phone numbers or pay outside the site." },
        { title: "Send an offer", description: "Offer the price you want to pay. The seller accepts or declines." },
        walletStep,
        { title: "Pay safely", description: "When the seller accepts, pay from your wallet. Ethio Computer holds the money until you have the account." },
        { title: "Get the account and confirm", description: "The seller transfers the account to you. Change the password and email, check everything, then confirm. Only then is the seller paid." },
      ],
      action: { label: "Find an account to buy", href: "#listings" },
    },
    sell: {
      tab: "How to sell",
      steps: [
        { title: "Sign in", description: "Sign in with your Google account. It takes a few seconds." },
        { title: "Add your account", description: "Choose the platform and enter the username, followers, price and a few screenshots of the analytics." },
        { title: "Prove it's yours", description: "Put the code we give you in the account's bio. An admin checks it and approves the listing." },
        { title: "Accept an offer", description: "Buyers send offers. Accept the one you like; the buyer pays and the money is held." },
        { title: "Hand over the account", description: "Transfer the account to the buyer as agreed in the chat." },
        { title: "Get paid", description: "When the buyer confirms, the money (after the fee) goes to your wallet. Withdraw it to your bank or Telebirr." },
      ],
      action: { label: "Sell your account", href: "/sell" },
    },
  },
  electronics: {
    title: "How to buy and sell gear",
    buy: {
      tab: "How to buy",
      steps: [
        { title: "Sign in", description: "Sign in with your Google account. It takes a few seconds." },
        { title: "Find the item", description: "Pick a category, compare photos, condition and price, and open the item to see all the details." },
        { title: "Ask the seller", description: "Press Ask the seller and ask about the item. If you agree on a lower price, the seller changes it on the page." },
        walletStep,
        { title: "Pay safely", description: "Press Buy. The money leaves your wallet but is held by Ethio Computer, and the item is hidden from other buyers." },
        { title: "Meet and check", description: "Agree in the chat on a safe public place and time. Test the item well before confirming." },
        { title: "Confirm you received it", description: "Press I received the item and the seller gets paid. If something is wrong, report it before confirming." },
      ],
      action: { label: "Find gear to buy", href: "#items" },
    },
    sell: {
      tab: "How to sell",
      steps: [
        { title: "Sign in", description: "Sign in with your Google account. It takes a few seconds." },
        { title: "Post your item", description: "Choose the category and condition, write an honest description, set the price and add 1 to 4 real photos." },
        { title: "Wait for approval", description: "An admin checks the item, usually within a day, and then it goes live." },
        { title: "Answer buyers", description: "Buyers ask questions in the chat. If you agree on a lower price, change it on My items." },
        { title: "Hand over the item", description: "When a buyer pays, meet them, hand over the item and press I handed over the item." },
        { title: "Get paid", description: "When the buyer confirms, the money (after the fee) goes to your wallet. Withdraw it to your bank or Telebirr." },
      ],
      action: { label: "Sell your gear", href: "/dashboard/electronics/new" },
    },
  },
  talent: {
    title: "How to hire a pro or offer your skills",
    buy: {
      tab: "How to hire",
      steps: [
        { title: "Sign in", description: "Sign in with your Google account. It takes a few seconds." },
        { title: "Pick a pro", description: "Choose a category, then compare portfolios, prices and reviews." },
        { title: "Ask a question", description: "Press Ask a question and explain what you need. Agree on the price if the job is bigger." },
        walletStep,
        { title: "Hire and pay safely", description: "Press Hire. The money is held by Ethio Computer and the pro starts when they accept." },
        { title: "Get your work", description: "The pro delivers on the site. Ask for changes if something isn't right." },
        { title: "Approve and review", description: "When you approve, the pro gets paid. Then leave a review for others." },
      ],
      action: { label: "Find a pro", href: "#pros" },
    },
    sell: {
      tab: "How to offer your skills",
      steps: [
        { title: "Sign in", description: "Sign in with your Google account. It takes a few seconds." },
        { title: "Add your service", description: "Choose the category, describe what you do, set a starting price and add samples of your work." },
        { title: "Wait for approval", description: "An admin checks your samples and approves the service." },
        { title: "Accept jobs", description: "Clients chat with you and hire you. The money is held before you start." },
        { title: "Deliver and get paid", description: "Deliver the work on the site. When the client approves, the money (after the fee) goes to your wallet." },
      ],
      action: { label: "Offer your skills", href: "/dashboard/talent/new" },
    },
  },
  subscriptions: {
    title: "How to pay for a subscription",
    buy: {
      tab: "How to buy",
      steps: [
        { title: "Sign in", description: "Sign in with your Google account. It takes a few seconds." },
        { title: "Choose the subscription", description: "Pick the category, then the service and the plan you want, like 1 month or 1 year." },
        { title: "Enter your account", description: "Write the email or username of the account to activate. Never send us your password." },
        { title: "Pay", description: "Pay from your wallet, or with Chapa using Telebirr, CBE Birr or your bank." },
        { title: "We activate it", description: "We buy it with our card and activate it on your account, usually within a few hours." },
        { title: "Check My subscriptions", description: "When it's active you see a message there. If we can't activate it, the money returns to your wallet." },
      ],
      action: { label: "Choose a subscription", href: "#store" },
    },
  },
  services: {
    title: "How to order a service",
    buy: {
      tab: "How to order",
      steps: [
        { title: "Choose a service", description: "Pick the service you need from the list on this page." },
        { title: "Message us on Telegram", description: "Press Order on Telegram and tell us which service you want and the link to your account or channel." },
        { title: "Get the price", description: "We tell you the price and how long it takes before you pay anything." },
        { title: "Pay and we start", description: "Pay as we agree and we start the work right away." },
        { title: "See the result", description: "We keep you updated on Telegram until the job is done." },
      ],
      action: { label: "Order on Telegram", href: "https://t.me/ethiocomputerschool", external: true },
    },
  },
} satisfies Record<string, Guide>;

export type GuideId = keyof typeof guides;
