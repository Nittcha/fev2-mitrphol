import React from "react";
import Image from "next/image";
interface SidebarProps {
  selectedZone: string;
  onSelectZone: (zone: string) => void;
}

const zones = [
  { id: "sb", name: "SB" },
  { id: "mac", name: "MAC" },
  { id: "mks", name: "MKS" },
  { id: "mpdc", name: "MPDC" },
  { id: "mpl", name: "MPL" },
  { id: "mpv", name: "MPV" },
  { id: "mpk", name: "MPK" },
];

const Sidebar: React.FC<SidebarProps> = ({ selectedZone, onSelectZone }) => {
  return (
    <div className="h-dvh w-60">
      <div className="flex items-center justify-center p-2">
        <Image
          src="/mitrphol-logo.png"
          alt="Mitrphol Logo"
          height={100}
          width={100}
        />
      </div>
      <ul className="flex flex-col h-dvh gap-4 p-2">
        {zones.map((zone) => (
          <li
            key={zone.id}
            onClick={() => onSelectZone(zone.id)}
            style={{
              cursor: "pointer",
              fontWeight:
                selectedZone === zone.id ? "bold text-blue-500" : "normal",
            }}
            className={`${
              selectedZone === zone.id ? "text-sky-500" : "text-black"
            } bg-gray-100 p-6 rounded-md flex justify-center items-center shadow drop-shadow-sm`}
          >
            {zone.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
