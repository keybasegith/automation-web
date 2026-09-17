import AdvisorCard from "./AdvisorCard";
import type { PersonProfile } from "@/lib/people/types";

/**
 * The directory's list of advisors.
 *
 * Shared by both directory modes — the plain server-rendered grid and the
 * filterable one — so the cards are identical whichever is in play, and are in
 * the server-rendered HTML either way.
 */
export default function AdvisorGrid({ advisors }: { advisors: PersonProfile[] }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {advisors.map((person, index) => (
        <li key={person.id} className="h-full">
          <AdvisorCard person={person} priority={index === 0} />
        </li>
      ))}
    </ul>
  );
}
