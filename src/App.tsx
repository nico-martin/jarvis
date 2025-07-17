import { useState } from "react";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="mb-8 text-4xl font-bold text-gray-900">Alfred</h1>
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-2xl font-semibold">
            React + TypeScript + Vite
          </h2>
          <div className="mb-4">
            <button
              onClick={() => setCount((count) => count + 1)}
              className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
            >
              Count is {count}
            </button>
          </div>
          <p className="text-gray-600">
            Edit <code className="rounded bg-gray-100 px-1">src/App.tsx</code>{" "}
            and save to test HMR
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
