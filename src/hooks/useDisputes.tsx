import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Dispute {
  id: string;
  user_id: string;
  transaction_id: string;
  dispute_reason: string;
  dispute_details: string | null;
  status: "pending" | "investigating" | "resolved" | "rejected";
  admin_response: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useDisputes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ["disputes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("transaction_disputes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Dispute[];
    },
  });

  const createDisputeMutation = useMutation({
    mutationFn: async ({
      transactionId,
      reason,
      details,
    }: {
      transactionId: string;
      reason: string;
      details: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("transaction_disputes")
        .insert({
          user_id: user.id,
          transaction_id: transactionId,
          dispute_reason: reason,
          dispute_details: details,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Dispute submitted",
        description: "Admin will review your dispute within 24-48 hours",
      });
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit dispute",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getDisputeForTransaction = (transactionId: string) => {
    return disputes.find((d) => d.transaction_id === transactionId);
  };

  return {
    disputes,
    isLoading,
    createDispute: createDisputeMutation.mutate,
    isCreatingDispute: createDisputeMutation.isPending,
    getDisputeForTransaction,
  };
};
