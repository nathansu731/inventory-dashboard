
export type Notification = {
    id: string;
    type: "job" | "product" | "subscription" | "general";
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    jobStatus?: "pending" | "in-progress" | "completed" | "failed";
    priority?: "low" | "medium" | "high";
    details?: string;
    relatedUser?: string;
    actionRequired?: boolean;
};

export type JobStatusColorClass =
    | "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    | "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    | "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
    | "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    | "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";