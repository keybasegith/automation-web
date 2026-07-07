"use client";

import InfoModal from "./InfoModal";

const heading = "font-serif text-[19px] font-normal text-[#0a1f33]";

export default function ComplaintHandlingProcess() {
  return (
    <InfoModal label="Complaint Handling Process" title="Complaint Handling Process">
      <p>
        Keybase Financial Group Inc. has procedures in place to handle any written
        or verbal complaints received from clients in a fair and prompt manner.
        This is a summary of those procedures, which we provide to new clients,
        clients who have filed a complaint and that we also make available on our
        website at{" "}
        <a
          href="https://www.keybase.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#006d6e] hover:underline"
        >
          www.keybase.com
        </a>
        .
      </p>

      <div>
        <h3 className={heading}>The Client Complaint Information Form</h3>
        <p className="mt-2">
          We also provide new clients and clients who complain with separate
          information (or &ldquo;separate documents&rdquo;) called the Client
          Complaint Information Form (&ldquo;CCIF&rdquo;) that provides general
          information about their options for making a complaint.
        </p>
      </div>

      <div>
        <h3 className={heading}>
          How to File a Complaint with Keybase Financial Group
        </h3>
        <p className="mt-2">
          Clients wishing to complain to Keybase Financial Group Inc. may make
          their complaint to our head office by contacting the Complaint Officer
          by:
        </p>
        <ul className="mt-3 space-y-1.5 pl-5">
          <li className="list-disc">
            Email to{" "}
            <a
              href="mailto:complaint@keybase.com"
              className="font-semibold text-[#006d6e] hover:underline"
            >
              complaint@keybase.com
            </a>
            ,<sup>1</sup> or by
          </li>
          <li className="list-disc">
            Faxing to 905-709-7022 (Attn: Complaint Officer)
          </li>
          <li className="list-disc">
            Mailing to the attention of Complaint Officer
            <br />
            101- 1725 16th Ave., Richmond Hill, ON. L4B 0B3.
          </li>
        </ul>
        <p className="mt-3">
          We encourage clients to make their complaint in writing where possible.
          Where clients have difficulty putting their complaint in writing, they
          should advise us so that we can provide assistance. For confidentiality
          reasons, we will only deal with the client or another individual who has
          the client&apos;s express written authorization to deal with us.
        </p>
      </div>

      <div>
        <h3 className={heading}>Complaint Handling Procedures</h3>
        <p className="mt-2">
          We will acknowledge receipt of complaints promptly, generally within
          five (5) days. We review all complaints fairly, taking into account all
          relevant documents and statements obtained from the client, our records,
          our advisor, other staff members and any other relevant source. Once our
          review is complete, we provide clients with our response, which will be
          in writing. Our response may be an offer to resolve your complaint, a
          denial of the complaint with reasons or another appropriate response.
          Where the complaint relates to certain serious allegations<sup>2</sup>,
          our initial acknowledgement will include copies of this summary and the
          CCIF. Our response will summarize your complaint, our findings and will
          contain a reminder about your options with the Ombudsman for Banking
          Services and Investments. We will generally provide our response within
          ninety days, unless we are waiting for additional information from you,
          or the case is novel or very complicated. We will respond to
          communications you send us after the date of our response to the extent
          necessary to implement a resolution or to address any new issues or
          information you provide.
        </p>
      </div>

      <div>
        <h3 className={heading}>Settlements</h3>
        <p className="mt-2">
          If we offer you a financial settlement, we may ask you to sign a release
          and waiver for legal reasons.
        </p>
      </div>

      <div>
        <h3 className={heading}>Contacting Keybase Financial Group Inc.</h3>
        <p className="mt-2">
          Clients may contact us at any time to provide further information or to
          inquire as to the status of their complaint, by contacting the individual
          handling their complaint or by contacting the Complaint Officer.
        </p>
      </div>

      <div className="border-t border-black/10 pt-4 text-[12px] leading-relaxed text-[#7a828d]">
        <p className="flex gap-1.5">
          <sup>1</sup>
          <span>
            Clients who choose to communicate by email should be aware of possible
            confidentiality issues regarding internet communications.
          </span>
        </p>
        <p className="mt-2 flex gap-1.5">
          <sup>2</sup>
          <span>
            As defined in the Policies of the CIRO of which Keybase Financial
            Group Inc. is a Member.
          </span>
        </p>
      </div>
    </InfoModal>
  );
}
