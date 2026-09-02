"use client";

import { useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CheckCircle2, Coins, Loader2, Lock, Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";
import { CreditPacks } from "./credit-packs";

const CREDIT_ADDING_OPERATIONS = new Set([
  "GRANT",
  "UNFREEZE",
  "AUTO_UNFREEZE",
]);

/**
 * Credits page: balance broken out into available / frozen / used, plus the
 * ledger behind it. Frozen is given equal billing with available because it is
 * the number that explains "why can't I start another batch?".
 */
export function CreditsView() {
  const t = useTranslations("headshots.credits");
  const format = useFormatter();

  const credits = api.headshots.credits.useQuery();

  const {
    data: recordPages,
    isLoading: recordsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.billing.getRecords.useInfiniteQuery(
    { limit: 20 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor },
  );

  const records = useMemo(
    () => recordPages?.pages.flatMap((page) => page.records) ?? [],
    [recordPages],
  );

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-poppins text-3xl font-medium tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BalanceCard
          icon={<Coins className="h-4 w-4" />}
          label={t("available")}
          hint={t("availableHint")}
          value={credits.data?.available}
          isLoading={credits.isLoading}
          emphasis
        />
        <BalanceCard
          icon={<Lock className="h-4 w-4" />}
          label={t("frozen")}
          hint={t("frozenHint")}
          value={credits.data?.frozen}
          isLoading={credits.isLoading}
        />
        <BalanceCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label={t("used")}
          hint={t("usedHint")}
          value={credits.data?.used}
          isLoading={credits.isLoading}
        />
        <BalanceCard
          icon={<Sigma className="h-4 w-4" />}
          label={t("total")}
          value={credits.data?.total}
          isLoading={credits.isLoading}
        />
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t("buyTitle")}</h2>
        <CreditPacks />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t("historyTitle")}</h2>

        {recordsLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : records.length === 0 ? (
          <p className="border-border text-muted-foreground rounded-xl border border-dashed p-10 text-center">
            {t("historyEmpty")}
          </p>
        ) : (
          <>
            <div className="border-border overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columnDate")}</TableHead>
                    <TableHead>{t("columnType")}</TableHead>
                    <TableHead className="text-right">
                      {t("columnAmount")}
                    </TableHead>
                    <TableHead>{t("columnDescription")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => {
                    const adds = CREDIT_ADDING_OPERATIONS.has(
                      record.operationType,
                    );
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {format.dateTime(new Date(record.createdAt), {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </TableCell>
                        <TableCell>
                          {translateOperation(t, record.operationType)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono",
                            adds
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-foreground",
                          )}
                        >
                          {adds ? "+" : "−"}
                          {record.amount}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[280px] truncate">
                          {record.description ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {hasNextPage && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  disabled={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  {isFetchingNextPage && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t("loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function BalanceCard({
  icon,
  label,
  hint,
  value,
  isLoading,
  emphasis,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  value?: number;
  isLoading: boolean;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5",
        emphasis ? "border-primary/50 bg-primary/5" : "border-border bg-card",
      )}
    >
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        {icon}
        {label}
      </div>
      {isLoading ? (
        <Skeleton className="mt-3 h-9 w-20" />
      ) : (
        <p className="font-poppins mt-2 text-3xl font-medium tracking-tight">
          {(value ?? 0).toLocaleString()}
        </p>
      )}
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </div>
  );
}

/** Falls back to the raw operation name rather than showing a missing key. */
function translateOperation(
  t: ReturnType<typeof useTranslations<"headshots.credits">>,
  operationType: string,
): string {
  const known = [
    "GRANT",
    "FREEZE",
    "CONSUME",
    "UNFREEZE",
    "AUTO_UNFREEZE",
    "AUTO_CONSUME",
    "UNDEFINED",
  ];
  if (!known.includes(operationType)) return operationType;
  return t(`operation.${operationType}` as "operation.GRANT");
}
