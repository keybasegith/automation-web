"use client";

import InfoModal from "./InfoModal";

const heading = "font-serif text-[19px] font-normal text-[#0a1f33]";
const subheading = "font-semibold text-[#1a2433]";

export default function PrivacyPolicy() {
  return (
    <InfoModal label="Privacy Policy" title="Privacy Policy">
      <div>
        <h3 className={heading}>Things you should know</h3>
        <p className="mt-2">
          At Keybase Financial Group Inc., the protection of your personal
          information is of the utmost importance.
        </p>
        <p className="mt-3">
          We collect and use your personal information to evaluate your investment
          needs, to access which of our products and services will meet your needs,
          and to effectively manage your investments with us.
        </p>
        <p className="mt-3">
          To comply with the federal and provincial privacy legislation, Keybase
          Financial Group Inc. has implemented the following Privacy Policy.
        </p>
      </div>

      <div>
        <h3 className={heading}>Protecting Privacy</h3>
        <ul className="mt-2 space-y-1.5 pl-5">
          <li className="list-disc">
            We will keep your personal and business information confidential
          </li>
          <li className="list-disc">
            We will allow you to control how we collect, use and disclose personal
            information by first acquiring your consent
          </li>
          <li className="list-disc">
            We will allow you access to the personal information we have about you
          </li>
          <li className="list-disc">
            We will not sell your information to third parties
          </li>
        </ul>
      </div>

      <div>
        <h3 className={heading}>Our Principles</h3>
        <div className="mt-2 space-y-3">
          <p>
            <span className={subheading}>Accountability.</span> We will be
            responsible for protecting all of your personal information that is in
            our control or is transferred to third parties with your consent. Our
            Privacy Officer will be accountable for ensuring our compliance with the
            principles described in this policy and applicable federal or provincial
            legislation.
          </p>
          <p>
            <span className={subheading}>Identifying Purposes.</span> The purpose(s)
            for which your information is being collected will be identified,
            explained and documented at the time of collection.
          </p>
          <p>
            <span className={subheading}>Consent.</span> We will obtain your consent
            prior to collecting, using and disclosing your personal information. Your
            informed consent (expressed or implied) will be required for collection,
            use or disclosure of personal information (except where permitted or
            mandated by law).
          </p>
          <p>
            <span className={subheading}>Limited Collection.</span> We will only
            collect personal information that is needed for the specific purposes of
            servicing your accounts and investment needs.
          </p>
          <p>
            <span className={subheading}>Disclosure and Retention.</span> We will use
            and disclose your information only for the purposes we will identify, or
            when it is mandated or permitted by law. We will retain your personal
            information only for as long as it is necessary.
          </p>
          <p>
            <span className={subheading}>Accuracy.</span> We will keep your
            information accurate, complete and up to date as is reasonably possible.
          </p>
          <p>
            <span className={subheading}>Safeguards.</span> We will safeguard your
            information with appropriate protective and security measures.
          </p>
          <p>
            <span className={subheading}>Openness.</span> With a reasonable time
            after receipt of your written request, we will provide you with specific
            information on our personal information management policies and
            procedures. We will provide you with information that is easily
            understandable and we will encourage you to contact us with any
            questions.
          </p>
          <p>
            <span className={subheading}>Access.</span> You will have the right to
            review any and all personal information we have about you, except where
            we are required or permitted by federal or provincial law to deny your
            access for a specific reason. We encourage you to verify the accuracy of
            your personal information and inform us in a timely manner of any
            corrections that need to be made.
          </p>
        </div>
      </div>

      <div>
        <h3 className={heading}>Concerns</h3>
        <p className="mt-2">
          If you have any concerns you will be able to request that our Privacy
          Officer investigate the matter and respond to your concerns with a
          reasonable time.
        </p>
      </div>

      <div>
        <h3 className={heading}>What is personal information</h3>
        <p className="mt-2">
          &ldquo;Personal information&rdquo; can generally be defined as information
          that identifies you as an individual. It includes, but is not limited to:
        </p>
        <ul className="mt-3 space-y-1.5 pl-5">
          <li className="list-disc">Your name and legal land address</li>
          <li className="list-disc">Your age and gender</li>
          <li className="list-disc">Your financial history</li>
          <li className="list-disc">
            Your identification numbers including your social insurance number
          </li>
          <li className="list-disc">Personal references you have provided</li>
          <li className="list-disc">Your employment history</li>
        </ul>
      </div>

      <div>
        <h3 className={heading}>2. Why we ask for your personal information?</h3>
        <p className="mt-2">
          We will only collect the information we need to provide you with our
          services and products. The purpose(s) for using your personal information
          will be explained to you so that you may provide us with informed consent.
        </p>
        <ul className="mt-3 space-y-1.5 pl-5">
          <li className="list-disc">
            To protect you and Keybase Financial Group Inc. from identity theft and
            fraud.
          </li>
          <li className="list-disc">
            To access which products and services are best suited to your investment
            needs.
          </li>
          <li className="list-disc">
            To better understand and serve your unique financial situation and
            investment needs.
          </li>
          <li className="list-disc">
            To set up and manage products and services you have requested.
          </li>
          <li className="list-disc">
            To comply with federal and provincial legislation.
          </li>
        </ul>
        <p className="mt-3">
          You will have the option of not providing us with personal information.
          However, we will not be able to provide you with the product or service
          you requested or that we have offered to you.
        </p>
        <p className="mt-3">
          We will ensure you are aware of why we need to collect, use and disclose
          your personal information when you apply for any of our products and
          services. If we have a new purpose for using your personal information we
          will again seek your informed consent.
        </p>
      </div>

      <div>
        <h3 className={heading}>
          3. Where we will collect personal information from?
        </h3>
        <p className="mt-2">
          A majority of the information we will collect comes directly from your
          application for our products and services. With your consent, we may also
          acquire your personal information from credit bureaus, income sources and
          personal references you have provided. We will only request information
          that is relevant to the financial services applicable to you.
        </p>
      </div>

      <div>
        <h3 className={heading}>
          4. Who will we disclose your personal information to?
        </h3>
        <p className="mt-2">
          Generally we will not disclose your personal information without your
          prior and informed consent.
        </p>
        <p className="mt-3">
          With your prior consent we may disclose your personal information to other
          third parties outside Keybase Financial Group Inc. who assist us in
          servicing your best interests (including your financial institution). We
          will only disclose to these third parties the information that is
          necessary to serve your investment needs. We will select third party
          service providers that use comparable safeguard standards to our own.
          Before releasing any personal information to these third party service
          providers, we will require them to sign binding contracts whereby they
          agree to safeguard all of your personal information.
        </p>
        <p className="mt-3">
          However, the law permits or requires us to collect, use and disclose
          personal information without your consent in certain circumstances such
          as:
        </p>
        <ul className="mt-3 space-y-1.5 pl-5">
          <li className="list-disc">
            To assist investigation authorities or the courts
          </li>
          <li className="list-disc">
            To protect the public interest (e.g. to combat fraud or money
            laundering)
          </li>
          <li className="list-disc">To protect our interests</li>
          <li className="list-disc">
            To protect your interests when your consent cannot be obtained in a
            timely manner.
          </li>
        </ul>
        <p className="mt-3">
          We may also share your information with self-regulatory authorities when
          Keybase Financial Group Inc. is so required. These self regulatory
          organizations, such as the Mutual Funds Dealer Association (MFDA), require
          access to personal information for regulatory purposes. This includes:
          surveillance of trading-related activity, sales, financial compliance and
          regulatory audits; investigation of potential regulatory and statutory
          violations; regulatory databases; enforcement or disciplinary proceedings
          reporting to regulators; and information-sharing with authorities.
        </p>
      </div>

      <div>
        <h3 className={heading}>5. Will you be able to withdrawal consent?</h3>
        <p className="mt-2">
          You will be able to contact us to withdrawal your consent at any time
          provided there are no contractual or other legal requirements limiting
          such withdrawal. Your Investment Advisor or our Policy Officer will explain
          your options and any consequences of withdrawing your consent.
        </p>
        <p className="mt-3">
          If you do not want us to share information with our affiliates or any third
          party service providers who assist us in servicing your account, please
          contact us at any time.
        </p>
        <p className="mt-3">
          If you do not consent to certain uses of your personal information, or if
          your consent is properly and legally withdrawn, we may not be able to
          provide you with certain products or services. We will thoroughly explain
          the consequences to help with your decision.
        </p>
      </div>

      <div>
        <h3 className={heading}>
          6. How will we safeguard your personal information?
        </h3>
        <p className="mt-2">
          We will use a variety of security measures to protect your personal and
          investment information including:
        </p>
        <ul className="mt-3 space-y-1.5 pl-5">
          <li className="list-disc">Locked filing cabinets and offices</li>
          <li className="list-disc">Electronic security</li>
          <li className="list-disc">
            Secured retention and destruction of information
          </li>
          <li className="list-disc">
            Restricting employee access to files and data centres where applicable
          </li>
        </ul>
        <p className="mt-3">
          Our Policy Officer will be responsible for the review and adjustment of our
          procedures. We restrict access to your personal information to the
          employees/agents who service your accounts. Our Policy Officer will ensure
          our Privacy Policy is properly administered and that our security measures
          are up to date and effective.
        </p>
      </div>

      <div>
        <h3 className={heading}>
          7. How will you be able to find out what personal information we have
          collected about you?
        </h3>
        <p className="mt-2">
          You will be able to make a written request to know what personal
          information we have concerning you. You will have to provide us with a
          written request that has sufficient detail to enable us, with reasonable
          effort, to identify you and your personal information. We will generally
          respond within thirty days with the information you have requested or with
          a detailed reasonable explaining what that information is withheld.
        </p>
      </div>

      <div>
        <h3 className={heading}>
          8. How will you be able to change or correct your personal information?
        </h3>
        <p className="mt-2">
          If you need to change your personal information we have on file for you,
          please contact your Investment Advisor. You will have to provide us with a
          written request that has sufficient detail to enable us, with reasonable
          effort, to identify you and the personal information or correction being
          sought.
        </p>
        <p className="mt-3">
          We will correct inaccurate or incomplete information within a reasonable
          time and notify you when such changes are completed. There is no charge for
          correcting your information. We will also ensure that any third party that
          have received your personal information from us are notified of such
          changes or corrections. If there is any information that is still in
          dispute, we will make a note on your file.
        </p>
      </div>

      <div>
        <h3 className={heading}>
          9. How long will we keep your personal information?
        </h3>
        <p className="mt-2">
          Your personal information will be kept on file as long as we need it to
          provide you with the products and services you have requested and to meet
          legal and regulatory requirements. The length of time you personal
          information is retailed may vary according to the product or service and
          the sensitivity and nature of information. This period may extend beyond
          the termination of our relationship for as long as it is reasonably
          necessary for legal or business purposes. After your information is no
          longer needed for the specific purposes identified to you, we will destroy,
          delete, erase or convert your personal information to an anonymous form.
        </p>
      </div>

      <div>
        <h3 className={heading}>
          10. Who will you be able to contact if you have any questions regarding
          our Privacy Policy?
        </h3>
        <p className="mt-2">
          For users that register on our website (if any), we also store the personal
          information they provide in their user profile. All users can see, edit, or
          delete their personal information at any time (except they cannot change
          their username). Website administrators can also see and edit that
          information.
        </p>
      </div>

      <div>
        <h3 className={heading}>Privacy and Personal Information</h3>
        <p className="mt-2">
          Your information and the business you do with Keybase is kept in strict
          confidence.
        </p>
        <ul className="mt-3 space-y-2 pl-5">
          <li className="list-disc">
            Only authorized personnel have access to your information.
          </li>
          <li className="list-disc">
            We collect, use and disclosure personal information that a reasonable
            person would consider appropriate for the circumstances.
          </li>
          <li className="list-disc">
            Our procedures and systems are designed to protect your information from
            error, loss and unauthorized access.
          </li>
          <li className="list-disc">
            We keep your information for only as long as it is needed and/or required
            by regulation.
          </li>
          <li className="list-disc">
            We monitor our compliance with applicable privacy legislation.
          </li>
          <li className="list-disc">
            You understand that Self-regulatory organizations (&lsquo;SRO&rsquo;) and
            other regulatory authorities require access to your personal information.
            Regulatory authorities collect, use or disclosure such personal
            information obtained from regulated persons for regulatory purposes.
          </li>
          <li className="list-disc">
            You understand that in signing this document you are giving permission to
            your Advisor to obtain and keep on file personal information that you have
            provided to him/her.
          </li>
          <li className="list-disc">
            You understand that this personal information, not publicly published
            about you, may include but is not limited to: income tax information,
            account statements from other firms, including banks, trust companies or
            fund companies; pension plan information; legal documents including wills,
            trusts, and power of attorney.
          </li>
          <li className="list-disc">
            You understand that your Keybase Advisor may use and disclose this
            information in order to: communicate with you in a timely and efficient
            manner; assess your application for investment; insurance and other
            services available to you by his/her firm; assess your financial
            situation and contact you with any other suitable products that he/she is
            authorized to see; evaluate claims and underwriting risks when required;
            detect and prevent fraud; analyze business results; and act as required
            or authorized by law.
          </li>
          <li className="list-disc">
            You understand that you have the right to know why an organization
            collects, uses or discloses your personal information; you have the right
            to expect an organization to handle your information reasonably and to not
            use it for any purpose other than the one to which you consented; you have
            the right to know who in an organization is responsible for protecting
            your information; you have the right to expect an organization to protect
            your information from unauthorized disclosure; you have the right to
            inspect the information an organization holds about you and make sure it
            is accurate, complete and current; you have the right to confidentially
            complain to an organization about how it handles your information and may
            escalate your complaint to the Privacy Commissioner of Canada if need be;
            and you have the right to remove your consent at any time by contacting
            your Advisor in writing.
          </li>
          <li className="list-disc">
            You understand that your Advisor will not: sell your information to
            anyone; or share your information with organizations outside of our
            relationship that would use it to contact you about their own products or
            services.
          </li>
        </ul>
        <p className="mt-3">
          Your Advisor must decline to accept or administer an account if you do not
          consent to such intended collection, use disclosure of personal information
          to SROs and the use and disclosure of that information by SRO&rsquo;s.
        </p>
        <p className="mt-3">
          If you have any questions or concerns about the way your personal
          information is collected, used or disclosed by Keybase Financial Group
          Inc., you will be able to contact our Privacy Officer at:
        </p>
        <address className="mt-3 not-italic leading-relaxed">
          <span className={subheading}>Privacy Officer</span>
          <br />
          Keybase Financial Group Inc.
          <br />
          101 – 1725 16th Avenue
          <br />
          Richmond Hill, ON
          <br />
          L4B 0B3
          <br />
          Phone:{" "}
          <a href="tel:+19057097911" className="font-semibold text-[#006d6e] hover:underline">
            905-709-7911
          </a>
          <br />
          Fax: 905-946-9737
        </address>
      </div>
    </InfoModal>
  );
}
