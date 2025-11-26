export default function SkeletonCard() {
  return (
    <div className="group bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-row md:flex-col h-32 md:h-auto animate-pulse">
      {/* Görsel Alanı */}
      <div className="w-32 h-full md:w-full md:h-40 bg-gray-200 dark:bg-gray-700 shrink-0"></div>
      
      {/* İçerik Alanı */}
      <div className="p-3 md:p-4 flex-1 flex flex-col justify-between space-y-2">
        <div className="flex justify-between">
          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="flex justify-between mt-2">
           <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
           <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700"></div>
        </div>
      </div>
    </div>
  )
}