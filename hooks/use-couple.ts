import { useContext } from "react";
import { CoupleContext } from "@/contexts/couple-context";

export function useCouple() {
  const context = useContext(CoupleContext);
  if (!context) {
    throw new Error("useCouple must be used within a CoupleProvider");
  }
  return context;
}
