import { Button } from "../components/ui";

const NotFound = () => (
  <section className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 pt-32 pb-20">
    <p className="text-magenta-dark font-bold text-xs tracking-widest uppercase mb-3">404</p>
    <h1 className="text-2xl md:text-[28px] font-bold text-plum mb-3">This page could not be found</h1>
    <p className="text-muted mb-8">The page may have moved. Let's get you back on track.</p>
    <Button to="/">Back to home</Button>
  </section>
);

export default NotFound;
