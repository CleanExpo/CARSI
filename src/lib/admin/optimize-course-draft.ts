export type OptimizedModuleDraft = {
  title: string;
  textContent: string;
};

export type OptimizedCourseDraft = {
  token: string;
  generatedAt: string;
  title: string;
  description: string;
  modules: OptimizedModuleDraft[];
};
