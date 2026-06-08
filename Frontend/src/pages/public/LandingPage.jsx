import { Link } from "react-router-dom";
import { Droplet, LogIn, MapPin, UserPlus } from "lucide-react";
import PublicLayout from "../shared/PublicLayout";
import { BLOOD_GROUPS, COMPATIBILITY } from "../../utils/bloodGroups";
import BloodGroupBadge from "../../components/common/BloodGroupBadge";

const LandingPage = () => (
  <PublicLayout>
    <section className="bg-white">
      <div className="mx-auto grid min-h-[calc(100vh-66px)] max-w-7xl items-center gap-8 px-4 py-10 md:grid-cols-2">
        <div>
          <h1 className="text-5xl font-black leading-tight text-slate-900 md:text-6xl">
            Save Lives.
            <span className="block text-[#C0392B]">Donate Blood.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600">
            BloodLink helps donors and hospitals coordinate urgent blood needs
            with eligibility checks, alerts, inventory and rewards.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="btn-primary" to="/register">
              <UserPlus size={16} /> Register as Donor
            </Link>
            <Link className="btn-outline" to="/login">
              <LogIn size={16} /> Login
            </Link>
          </div>
        </div>
        <div className="relative mx-auto h-80 w-64">
          <div className="absolute left-8 top-4 h-64 w-48 rounded-b-[4rem] rounded-t-3xl border-8 border-[#1A2340] bg-red-50">
            <div className="absolute bottom-0 h-36 w-full rounded-b-[3.2rem] bg-[#C0392B]" />
            <div className="absolute left-1/2 top-16 h-20 w-20 -translate-x-1/2 rounded-full bg-white/60" />
          </div>
          <div className="absolute left-28 top-0 h-12 w-8 rounded-t-xl bg-[#1A2340]" />
          <div className="absolute left-32 top-0 h-28 w-24 rounded-r-full border-r-4 border-t-4 border-[#1A2340]" />
        </div>
      </div>
    </section>

    <section className="border-y border-slate-200 bg-[#1A2340] py-6 text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-3 gap-4 px-4 text-center">
        {["10,000+ Donors", "500+ Hospitals", "50,000+ Lives Saved"].map(
          (item) => (
            <div key={item} className="text-lg font-black md:text-3xl">
              {item}
            </div>
          ),
        )}
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-12">
      <h2 className="mb-6 text-2xl font-black">How It Works</h2>
      <div className="page-grid">
        {["Register", "Get Matched", "Donate"].map((step, index) => (
          <div className="card" key={step}>
            <div className="mb-3 text-[#C0392B]">
              {index === 0 && <UserPlus size={28} />}
              {index === 1 && <MapPin size={28} />}
              {index === 2 && <Droplet size={28} fill="currentColor" />}
            </div>
            <h3 className="text-lg font-black">{step}</h3>
            <p className="mt-2 text-sm text-slate-500">
              A simple workflow built for quick response and clear status
              tracking.
            </p>
          </div>
        ))}
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 pb-12">
      <h2 className="mb-6 text-2xl font-black">Blood Group Compatibility</h2>
      <div className="page-grid">
        {BLOOD_GROUPS.map((group) => (
          <div className="card" key={group}>
            <BloodGroupBadge group={group} />
            <p className="mt-3 text-sm text-slate-500">Can receive from</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {COMPATIBILITY[group].map((compatible) => (
                <BloodGroupBadge
                  key={compatible}
                  group={compatible}
                  size="sm"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  </PublicLayout>
);

export default LandingPage;
