"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, ChevronRight, ChevronLeft } from "lucide-react";

type SpySerpProject = {
  id: number;
  name: string;
  disabled: number;
};

type SpySerpDomain = {
  domain_id: number;
  domain: string;
};

type SpySerpEngine = {
  project_se_id: string; // The key in the response object
  name: string;
  short: string;
  se_id: number; // Global SE ID
};

type SpySerpMasterSetupProps = {
  onComplete: (data: {
    projectId: string;
    domainId: string;
    engineId: string;
    valuemetricId: string;
  }) => void;
};

export function SpySerpMasterSetup({ onComplete }: SpySerpMasterSetupProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [projects, setProjects] = useState<SpySerpProject[]>([]);
  const [domains, setDomains] = useState<SpySerpDomain[]>([]);
  const [engines, setEngines] = useState<SpySerpEngine[]>([]);

  // Selection
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");
  const [selectedEngineId, setSelectedEngineId] = useState<string>("");
  const [selectedValuemetricId, setSelectedValuemetricId] = useState<string>("");

  // Fetch Projects
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/spyserp/proxy", {
          method: "POST",
          body: JSON.stringify({ method: "projects" }),
        });
        const data = await res.json();
        
        if (data.groups) {
          const allProjects: SpySerpProject[] = [];
          Object.values(data.groups).forEach((group: any) => {
            if (group.projects && Array.isArray(group.projects)) {
              allProjects.push(...group.projects);
            }
          });
          setProjects(allProjects);
        } else {
            // Fallback or error handling if structure is different
            console.warn("Unexpected projects structure", data);
        }
      } catch (err) {
        setError("Failed to fetch projects");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (step === 1) {
      fetchProjects();
    }
  }, [step]);

  // Fetch Domains when Project is selected and we move to step 2
  useEffect(() => {
    const fetchDomains = async () => {
      if (!selectedProjectId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/spyserp/proxy", {
          method: "POST",
          body: JSON.stringify({ 
            method: "projectDomains",
            project_id: Number(selectedProjectId)
          }),
        });
        const data = await res.json();
        if (data.items && Array.isArray(data.items)) {
          setDomains(data.items);
        }
      } catch (err) {
        setError("Failed to fetch domains");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (step === 2) {
      fetchDomains();
    }
  }, [step, selectedProjectId]);

  // Fetch Search Engines when Project is selected (can be done in step 3)
  useEffect(() => {
    const fetchEngines = async () => {
      if (!selectedProjectId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/spyserp/proxy", {
          method: "POST",
          body: JSON.stringify({ 
            method: "projectSearchEngines",
            project_id: Number(selectedProjectId)
          }),
        });
        const data = await res.json();
        // The API returns an object where keys are IDs
        const engineList: SpySerpEngine[] = Object.entries(data).map(([key, value]: [string, any]) => ({
            project_se_id: key,
            name: value.name,
            short: value.short,
            se_id: value.se_id
        }));
        setEngines(engineList);
      } catch (err) {
        setError("Failed to fetch search engines");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (step === 3) {
      fetchEngines();
    }
  }, [step, selectedProjectId]);

  const handleNext = () => {
    if (step === 1 && selectedProjectId) setStep(2);
    else if (step === 2 && selectedDomainId) setStep(3);
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const handleFinish = () => {
    onComplete({
      projectId: selectedProjectId,
      domainId: selectedDomainId,
      engineId: selectedEngineId,
      valuemetricId: selectedValuemetricId,
    });
  };

  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="text-base text-slate-200">Майстер налаштування SpySERP</CardTitle>
        <CardDescription>Крок {step} з 3</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-xs text-red-400">{error}</p>}
        
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400">Оберіть проект</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                  <SelectValue placeholder="Оберіть проект зі списку" />
                </SelectTrigger>
                <SelectContent>
                  {loading ? (
                    <div className="p-2 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-slate-500" /></div>
                  ) : projects.length === 0 ? (
                    <div className="p-2 text-xs text-slate-500">Проектів не знайдено</div>
                  ) : (
                    projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} (ID: {p.id})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleNext} disabled={!selectedProjectId} className="h-8 px-3 text-xs">
                Далі <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400">Оберіть домен</label>
              <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                  <SelectValue placeholder="Оберіть домен" />
                </SelectTrigger>
                <SelectContent>
                  {loading ? (
                    <div className="p-2 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-slate-500" /></div>
                  ) : domains.length === 0 ? (
                    <div className="p-2 text-xs text-slate-500">Доменів не знайдено</div>
                  ) : (
                    domains.map((d) => (
                      <SelectItem key={d.domain_id} value={String(d.domain_id)}>
                        {d.domain} (ID: {d.domain_id})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={handleBack} className="h-8 px-3 text-xs">
                <ChevronLeft className="mr-1 h-3 w-3" /> Назад
              </Button>
              <Button onClick={handleNext} disabled={!selectedDomainId} className="h-8 px-3 text-xs">
                Далі <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400">Оберіть пошукову систему (опціонально)</label>
              <Select 
                value={selectedEngineId} 
                onValueChange={(val) => {
                  setSelectedEngineId(val);
                  const engine = engines.find(e => String(e.project_se_id) === val);
                  if (engine) {
                    setSelectedValuemetricId(engine.project_se_id);
                  }
                }}
              >
                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                  <SelectValue placeholder="Всі пошукові системи" />
                </SelectTrigger>
                <SelectContent>
                  {loading ? (
                    <div className="p-2 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-slate-500" /></div>
                  ) : engines.length === 0 ? (
                    <div className="p-2 text-xs text-slate-500">Пошукових систем не знайдено</div>
                  ) : (
                    engines.map((e) => (
                      <SelectItem key={e.project_se_id} value={String(e.project_se_id)}>
                        {e.name} ({e.short})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={handleBack} className="h-8 px-3 text-xs">
                <ChevronLeft className="mr-1 h-3 w-3" /> Назад
              </Button>
              <Button onClick={handleFinish} className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
                <Check className="mr-1 h-3 w-3" /> Застосувати
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
