import Footer from "@/components/Footer";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <main className="container max-w-4xl py-10 md:py-16">
        <a
          href="/"
          className="mb-8 inline-flex text-sm font-medium text-primary hover:underline"
        >
          ← Back to Patel Electricals
        </a>

        <article className="rounded-xl border bg-background p-6 shadow-sm md:p-10">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: October 23, 2026</p>

          <div className="mt-8 space-y-7 leading-7 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground">1. About this policy</h2>
              <p className="mt-2">
                Patel Electricals (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates patelspares.com and
                supplies electrical spare parts. This policy explains how we collect, use, share, and protect
                personal information when you use our website, place an order, or contact us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">2. Information we collect</h2>
              <p className="mt-2">We may collect the information you provide to us, including:</p>
              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>Name, business name, phone number, email address, and delivery address.</li>
                <li>Order, invoice, product, delivery, and support-request details.</li>
                <li>Payment status and transaction reference details. Card or UPI payment details are processed by our payment provider and are not stored by us.</li>
                <li>Basic technical and usage information needed to operate and improve our website.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">3. How we use information</h2>
              <p className="mt-2">We use information to process orders, create invoices, arrange delivery, provide customer support, prevent fraud, maintain our records, and comply with legal obligations.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">4. WhatsApp notifications</h2>
              <p className="mt-2">
                If you give us your WhatsApp number and choose to receive WhatsApp notifications, we may send
                transactional messages such as order confirmations, delivery updates, and PDF invoices. We use
                these messages only for your order or account service, not for unrelated marketing. You may
                withdraw your consent at any time by contacting us or replying STOP where available.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">5. Sharing information</h2>
              <p className="mt-2">
                We share information only when necessary with service providers that help us run our business,
                such as payment processors, delivery partners, website hosting providers, and messaging
                providers. We may also disclose information where required by law. We do not sell personal information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">6. Data security and retention</h2>
              <p className="mt-2">
                We use reasonable safeguards to protect personal information. We retain information only for as
                long as needed for orders, support, business records, legal requirements, and dispute resolution.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">7. Your choices</h2>
              <p className="mt-2">
                You may request access to, correction of, or deletion of your personal information, subject to
                applicable legal requirements. You may also opt out of non-essential communications at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">8. Contact us</h2>
              <p className="mt-2">
                For privacy questions or requests, contact Patel Electricals at <a className="text-primary hover:underline" href="mailto:burhanghiya26@gmail.com">burhanghiya26@gmail.com</a> or call 8780657095.
              </p>
              <p className="mt-2">Address: Udhana Asha Nagar, near Madhi ni Khamni, Surat - 394210, India.</p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
