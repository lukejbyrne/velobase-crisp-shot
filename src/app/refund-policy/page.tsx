import { LegalLayout } from "@/components/layout/legal-layout";
import { APP_NAME } from "@/config/brand";
import { SUPPORT_EMAIL, supportMailto } from "@/config/brand";

export default function RefundPolicyPage() {
  return (
    <LegalLayout title="Refund Policy" lastUpdated="January 15, 2026">
      <section>
        <h3>1. General Policy</h3>
        <p>
          {APP_NAME} operates on a credit-based system, and you are only ever
          charged for headshots we actually deliver. A credit is reserved when
          an image starts generating and charged only once that image is
          produced; if it fails or is cancelled, the reserved credit returns to
          your balance automatically. You do not need to contact us for
          that&mdash;it happens on its own, per image.
        </p>
        <p>
          Separately from that automatic behaviour, purchases of credit packs
          are generally final once the credits have been used. By purchasing
          credits you acknowledge and agree that:
        </p>
        <ul>
          <li>
            AI-generated results are inherently variable, and two images from
            the same photograph will differ
          </li>
          <li>
            A computational cost is incurred for each image we successfully
            deliver
          </li>
          <li>
            Dissatisfaction with the styling of a successfully delivered
            headshot is not by itself grounds for a refund of that credit
          </li>
        </ul>
      </section>

      <section>
        <h3>2. Credit Packs</h3>
        <p>
          Credit pack purchases are final and non-refundable. Refunds will only
          be considered if:
        </p>
        <ul>
          <li>The request is made within 24 hours of purchase</li>
          <li>No credits from the pack have been used</li>
          <li>This is your first refund request</li>
        </ul>
        <p>
          <strong>Note:</strong> Each account is entitled to a maximum of one
          (1) courtesy refund. Subsequent refund requests for credit packs will
          not be honored.
        </p>
      </section>

      <section>
        <h3>3. Technical Issues</h3>
        <p>
          We will restore credits <strong>only</strong> in the following
          verified technical failure scenarios:
        </p>
        <ul>
          <li>
            <strong>Complete Generation Failure:</strong> The system failed to
            produce any output due to a server-side error (not client-side
            issues such as browser crashes or network disconnection).
          </li>
          <li>
            <strong>Corrupted Output:</strong> A delivered image file is
            unopenable or corrupted due to a system error (verified by our
            technical team).
          </li>
        </ul>
        <p>
          The following do <strong>NOT</strong> qualify for refunds or credit
          restoration:
        </p>
        <ul>
          <li>A delivered headshot that does not match your expectations</li>
          <li>
            Artifacts, distortions, or imperfections that are inherent to AI
            generation
          </li>
          <li>
            User error in prompt input, image upload, or settings configuration
          </li>
          <li>Slow generation times or queue delays</li>
          <li>Browser or client-side technical issues</li>
        </ul>
      </section>

      <section>
        <h3>4. How to Request a Refund</h3>
        <p>
          If you believe you qualify for a refund under this policy, submit your
          request within <strong>7 days</strong> of the transaction. Requests
          submitted after 7 days will not be considered.
        </p>
        <ul>
          <li>
            <strong>Email:</strong>{" "}
            <a href={supportMailto()}>{SUPPORT_EMAIL}</a>
          </li>
          <li>
            <strong>Required Information:</strong> Your account email,
            transaction ID or date, and specific reason for the request with
            supporting evidence (e.g., screenshot of error, generation ID).
          </li>
        </ul>
        <p>
          All refund requests are reviewed at our sole discretion. We reserve
          the right to deny any request that does not meet the criteria outlined
          in this policy.
        </p>
      </section>

      <section>
        <h3>5. Chargebacks & Disputes</h3>
        <p>
          Filing a chargeback or payment dispute without first contacting us
          constitutes a violation of these terms. If you initiate a chargeback:
        </p>
        <ul>
          <li>
            Your account will be immediately suspended pending investigation
          </li>
          <li>All unused credits will be forfeited</li>
          <li>You may be permanently banned from the platform</li>
          <li>
            We reserve the right to pursue recovery of disputed amounts plus
            associated fees
          </li>
        </ul>
        <p>
          Please contact our support team first—we are committed to resolving
          legitimate issues fairly.
        </p>
      </section>

      <section>
        <h3>6. Fraud & Abuse</h3>
        <p>
          We actively monitor for refund abuse patterns. The following behaviors
          will result in permanent account termination without refund:
        </p>
        <ul>
          <li>Submitting multiple refund requests across accounts</li>
          <li>Creating new accounts to circumvent refund limits</li>
          <li>Providing false or misleading information in refund requests</li>
          <li>Systematically requesting refunds after consuming services</li>
          <li>Any form of payment fraud or unauthorized transactions</li>
        </ul>
      </section>

      <section>
        <h3>7. Policy Updates</h3>
        <p>
          We reserve the right to modify this Refund Policy at any time. Changes
          will be effective immediately upon posting. Your continued use of the
          service after any changes constitutes acceptance of the updated
          policy.
        </p>
      </section>
    </LegalLayout>
  );
}
