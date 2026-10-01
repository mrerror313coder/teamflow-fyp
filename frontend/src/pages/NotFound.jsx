import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="glass-panel p-8 rounded-3xl max-w-md w-full text-center border border-slate-800">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <Layers className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">404</h1>
        <p className="text-sm font-semibold text-slate-300 mb-1">Page Not Found</p>
        <p className="text-xs text-slate-400 mb-6">
          The requested route does not exist in the TeamFlow portal.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Portal
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
