import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Search,
  Folder,
  Edit2,
  Trash2,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useLmsCategories,
  useCreateLmsCategory,
  useUpdateLmsCategory,
  useDeleteLmsCategory,
} from '../api/useLms';
import type { LmsCategory } from '../types/lms.types';

export function CategoryManagerPage() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LmsCategory | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    icon: 'Folder',
    isActive: true,
  });

  const { data: categories = [], isLoading } = useLmsCategories(search);
  const createMutation = useCreateLmsCategory();
  const updateMutation = useUpdateLmsCategory();
  const deleteMutation = useDeleteLmsCategory();

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setForm({
      name: '',
      description: '',
      icon: 'Folder',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: LmsCategory) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      description: category.description || '',
      icon: category.icon || 'Folder',
      isActive: Boolean(category.isActive ?? (category as any).is_active),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      await updateMutation.mutateAsync({ id: editingCategory.id, data: form });
    } else {
      await createMutation.mutateAsync(form);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (await window.appConfirm('Are you sure you want to delete this category?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-5 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" /> Learning Categories & Domains
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organize courses by skill domains, engineering, compliance, sales, and onboarding tracks.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="h-9 px-4 text-xs font-bold gap-1.5 shadow-sm rounded-lg">
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3 items-center bg-card border border-border/80 rounded-xl p-3.5 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-lg bg-background"
          />
        </div>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-44 animate-pulse bg-muted/40 rounded-xl" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="py-16 text-center bg-card border border-border/80 rounded-xl shadow-2xs">
          <Folder className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-bold text-foreground">No Categories Configured</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Create categories like Technical, Leadership, Compliance, and Onboarding to organize courses.
          </p>
          <Button onClick={handleOpenCreate} size="sm" className="mt-4 gap-1.5">
            <Plus className="w-4 h-4" /> Add Category
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((cat) => (
            <Card
              key={cat.id}
              className="border border-border/80 rounded-xl shadow-2xs hover:border-primary/40 transition-all bg-card flex flex-col justify-between"
            >
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <Folder className="w-5 h-5" />
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${
                      (cat.isActive ?? (cat as any).is_active)
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {(cat.isActive ?? (cat as any).is_active) ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold text-foreground mt-2">{cat.name}</CardTitle>
                <CardDescription className="text-xs line-clamp-2">
                  {cat.description || 'No description provided.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" /> {cat.courseCount || (cat as any).course_count || 0} Courses
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenEdit(cat)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-primary rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(cat.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Folder className="w-5 h-5 text-primary" />
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Category Name *</Label>
              <Input
                required
                placeholder="e.g. Engineering & Software Development"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Description</Label>
              <Textarea
                rows={3}
                placeholder="Details about skills in this category..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="catActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-primary"
              />
              <Label htmlFor="catActive" className="text-xs font-bold cursor-pointer">
                Active & Visible in Catalog
              </Label>
            </div>

            <DialogFooter className="pt-4 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> {editingCategory ? 'Save Changes' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
