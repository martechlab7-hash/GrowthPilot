"use client";

import { useParams } from "next/navigation";
import { Workspace } from "@/components/case/Workspace";

export default function StrategyPage() {
  const { id } = useParams<{ id: string }>();
  return <Workspace id={id} />;
}
