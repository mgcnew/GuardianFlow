export function MaintenanceSkeleton() {
    return (
        <div className="p-5 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-dark animate-pulse">
            <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-4 bg-gray-100 dark:bg-gray-800 rounded-full"></div>
                <div className="w-10 h-3 bg-gray-100 dark:bg-gray-800 rounded-full"></div>
            </div>
            <div className="w-3/4 h-6 bg-gray-100 dark:bg-gray-800 rounded-lg mb-2"></div>
            <div className="w-full h-10 bg-gray-50 dark:bg-gray-900/50 rounded-lg mb-4"></div>
            <div className="flex gap-4 mb-6">
                <div className="w-20 h-3 bg-gray-100 dark:bg-gray-800 rounded-full"></div>
                <div className="w-16 h-3 bg-gray-100 dark:bg-gray-800 rounded-full"></div>
            </div>
            <div className="w-full h-10 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
        </div>
    );
}

export function MaintenanceListSkeleton() {
    return (
        <div className="p-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-800 animate-pulse">
            <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-gray-100 dark:bg-gray-800"></div>
                <div className="space-y-2">
                    <div className="w-32 h-4 bg-gray-100 dark:bg-gray-800 rounded"></div>
                    <div className="w-24 h-3 bg-gray-100 dark:bg-gray-800 rounded"></div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="w-16 h-4 bg-gray-100 dark:bg-gray-800 rounded"></div>
                <div className="size-8 rounded-lg bg-gray-100 dark:bg-gray-800"></div>
            </div>
        </div>
    );
}
