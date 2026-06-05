import Image from "next/image";

const PDF_URL =
  "https://mcusercontent.com/cd693aa413d99a9695636b9f4/files/8910a56e-8621-2fac-1365-852b94fe36ea/BridleView_Sell_Sheet_Jan_2026_Wholesale_Advisor.pdf";

export default function WealthOffering() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white p-2 sm:p-4">
      <a
        href={PDF_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full max-w-5xl"
      >
        <Image
          src="/wealth-offering.jpg"
          alt="Wealth Offering"
          width={1200}
          height={1600}
          priority
          sizes="100vw"
          className="h-auto max-h-screen w-full object-contain"
        />
      </a>
    </div>
  );
}
