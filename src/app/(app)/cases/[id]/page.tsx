"use client";

import { useParams } from "next/navigation";
import { Workspace } from "@/components/case/Workspace";

export default function CasePage() {
  const { id } = useParams<{ id: string }>();
  return <Workspace id={id} />;
}
