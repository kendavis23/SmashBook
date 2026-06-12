import { CONTACT_EMAIL } from "../../../lib/site";
import { LegalPage, LegalSection } from "./LegalPage";

/*
 * TODO: have these terms reviewed by legal counsel before public launch, and
 * fill in the registered company name and governing law where marked.
 */
const SECTIONS: LegalSection[] = [
    {
        heading: "1. The service",
        paragraphs: [
            "SmashBook is a subscription software platform for padel club management, covering court bookings, payments, player management, tournaments, analytics, and AI-assisted club operations. The service is provided by SmashBook (registered company name and governing law to be added here).",
        ],
    },
    {
        heading: "2. Accounts",
        paragraphs: [
            "Club operators and players access the platform through individual accounts. You are responsible for keeping your credentials confidential and for activity that occurs under your account. Accounts must be registered with accurate information.",
        ],
    },
    {
        heading: "3. Subscriptions and payments",
        paragraphs: [
            "Clubs subscribe to SmashBook on a recurring plan. Player payments to clubs (court bookings, memberships) are processed through Stripe; SmashBook is not a party to the transaction between a player and a club beyond facilitating the payment.",
            "During early access, plan terms and pricing are agreed individually with each partner club.",
        ],
    },
    {
        heading: "4. Acceptable use",
        paragraphs: [
            "You may not misuse the service: no unauthorised access attempts, no interference with other clubs' data, no use of the platform for unlawful activity, and no reselling of the service without our agreement.",
        ],
    },
    {
        heading: "5. AI features",
        paragraphs: [
            "Some features produce AI-generated suggestions (for example pricing recommendations or message drafts). These are decision-support tools: the club remains responsible for the prices it sets and the messages it sends. AI features can be disabled per club.",
        ],
    },
    {
        heading: "6. Intellectual property",
        paragraphs: [
            "SmashBook owns the platform, its software, and its branding. Clubs own their data; we process it only to provide the service, as described in our Privacy Policy.",
        ],
    },
    {
        heading: "7. Liability and changes",
        paragraphs: [
            "The service is provided on an “as is” basis during early access. To the extent permitted by law, our liability is limited to the fees paid for the service. We may update these terms as the product evolves and will notify account holders of material changes.",
        ],
    },
    {
        heading: "8. Contact",
        paragraphs: [`Questions about these terms? Email us at ${CONTACT_EMAIL}.`],
    },
];

export function TermsPage() {
    return (
        <LegalPage
            title="Terms of Service"
            lastUpdated="June 2026"
            intro="These terms govern use of the SmashBook platform and website. SmashBook is currently in early access; these terms will be expanded as the product launches publicly."
            sections={SECTIONS}
        />
    );
}
