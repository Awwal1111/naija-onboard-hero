type WithdrawalClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

export async function reserveWithdrawal(
  supabase: WithdrawalClient,
  userId: string,
  amount: number,
  pin: unknown,
  reference: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("reserve_withdrawable_balance", {
    p_user_id: userId,
    p_amount: amount,
    p_pin: typeof pin === "string" ? pin : "",
    p_reference: reference,
  });

  if (error) {
    console.error("[WITHDRAWAL] Balance reservation failed:", error.message);
    throw new Error("Unable to authorize withdrawal");
  }

  switch (data) {
    case "ok":
      return;
    case "invalid_amount":
      throw new Error("Invalid withdrawal amount");
    case "insufficient_balance":
      throw new Error("Insufficient withdrawable balance");
    case "pin_not_set":
      throw new Error("Please set up your transaction PIN first");
    case "pin_locked":
      throw new Error("Too many incorrect PIN attempts. Try again in 15 minutes");
    case "duplicate_reference":
      throw new Error("Duplicate withdrawal request");
    default:
      throw new Error("Incorrect transaction PIN");
  }
}

export async function refundWithdrawal(
  supabase: WithdrawalClient,
  reference: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("refund_withdrawable_balance", {
    p_reference: reference,
  });

  if (error || data !== true) {
    console.error("[WITHDRAWAL] Balance refund failed:", error?.message ?? data);
    throw new Error("Failed to refund withdrawal balance");
  }
}

export async function commitWithdrawal(
  supabase: WithdrawalClient,
  reference: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("commit_withdrawable_balance", {
    p_reference: reference,
  });

  if (error || data !== true) {
    console.error("[WITHDRAWAL] Balance reservation finalization failed:", error?.message ?? data);
    throw new Error("Failed to finalize withdrawal balance reservation");
  }
}
