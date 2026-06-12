import { CONTACT_EMAIL } from "../../../lib/site";
import { LegalPage, LegalSection } from "./LegalPage";

/*
 * TODO: have this policy reviewed by legal counsel before public launch, and
 * fill in the registered company name and jurisdiction where marked.
 */
const SECTIONS: LegalSection[] = [
    {
        heading: "1. Who we are",
        paragraphs: [
            "SmashBook provides a software platform for padel club management, helping clubs manage bookings, payments, players, staff, memberships, tournaments, analytics, and related operations.",
            "For club and player data processed through the platform, SmashBook generally acts on behalf of the club using the service. For data collected directly through this website, such as enquiries, SmashBook is responsible for how that data is handled.",
        ],
    },
    {
        heading: "2. Data we collect",
        paragraphs: [
            "Account data: name, email address, login details, and profile information when an account is created.",
            "Club activity data: bookings, memberships, payments, match participation, staff activity, tournaments, and other actions performed within the platform.",
            "Payment data: payments are processed securely through Stripe. SmashBook does not store full card numbers. We retain payment references, transaction status, and related records needed to operate the service.",
            "Website enquiries: if you contact us, we collect the information you provide so we can respond to your request.",
        ],
    },
    {
        heading: "3. How we use data",
        paragraphs: [
            "We use data to operate, secure, and improve the platform, including managing bookings, processing payments, sending service notifications, supporting clubs and players, and maintaining accurate records.",
            "Some features may use analytics or machine-learning models to support functionality such as demand forecasting, operational insights, and player matchmaking. These features are designed to support club operations and improve the user experience.",
            "We do not sell personal data.",
        ],
    },
    {
        heading: "4. Service providers",
        paragraphs: [
            "We use trusted service providers to operate the platform, including cloud hosting, database infrastructure, payment processing, email delivery, push notifications, monitoring, and analytics.",
            "These providers only process data where needed to deliver their services to SmashBook and support the operation of the platform.",
        ],
    },
    {
        heading: "5. Data retention and security",
        paragraphs: [
            "We retain data for as long as needed to provide the platform, support clubs and players, meet legal or financial record-keeping requirements, and resolve disputes.",
            "We use technical and organisational measures to protect data, including access controls, encrypted storage where appropriate, role-based permissions, and separation of club data within the platform.",
        ],
    },
    {
        heading: "6. Your rights",
        paragraphs: [
            "Depending on your location, you may have rights to access, correct, export, delete, or restrict the use of your personal data.",
            "If your data is managed by a club using SmashBook, you may also contact that club directly. For website or platform privacy requests, you can contact us using the email below.",
        ],
    },
    {
        heading: "7. Contact",
        paragraphs: [`For privacy questions or requests, email us at ${CONTACT_EMAIL}.`],
    },
];
export function PrivacyPage() {
    return (
        <LegalPage
            title="Privacy Policy"
            lastUpdated="June 2026"
            intro="This policy explains what personal data SmashBook collects, why we collect it, and how we handle it. SmashBook is currently in early access; this policy will be expanded as the product launches publicly."
            sections={SECTIONS}
        />
    );
}
