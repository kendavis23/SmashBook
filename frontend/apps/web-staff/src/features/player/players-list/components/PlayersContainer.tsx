import type { JSX } from "react";
import { useClubAccess } from "../../store";
import PlayersView from "./PlayersView";

export default function PlayersContainer(): JSX.Element {
    const { clubId } = useClubAccess();

    return <PlayersView clubId={clubId} />;
}
