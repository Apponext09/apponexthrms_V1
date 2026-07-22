import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link as LinkIcon, Trash2, Camera, Check } from 'lucide-react';
import { useUpdateEmployee } from '../hooks/useEmployees';
import type { Employee } from '@/types';

interface ProfilePhotoUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  onSuccess?: () => void;
}

export function ProfilePhotoUploadModal({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: ProfilePhotoUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(employee.avatarUrl || '');
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');

  const { updateEmployee, isLoading, error } = useUpdateEmployee(employee.id || 0);

  const fullName = [employee.firstName, employee.middleName, employee.lastName]
    .filter(Boolean)
    .join(' ');
  const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (imageUrlInput.trim()) {
      setPreviewUrl(imageUrlInput.trim());
    }
  };

  const handleSave = async () => {
    try {
      await updateEmployee({
        avatarUrl: previewUrl || null,
      } as any);
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to update profile photo:', err);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setPreviewUrl('');
      setSelectedFile(null);
      await updateEmployee({
        avatarUrl: null,
      } as any);
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to remove profile photo:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Camera className="w-5 h-5 text-primary" />
            Update Profile Photo
          </DialogTitle>
          <DialogDescription>
            Upload a picture or set custom avatar initials for {fullName}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center py-4">
          {/* Avatar Preview */}
          <div className="relative group mb-4">
            <Avatar className="h-32 w-32 border-4 border-primary/20 shadow-lg transition-transform group-hover:scale-105">
              <AvatarImage src={previewUrl || undefined} alt={fullName} />
              <AvatarFallback className="text-3xl font-bold bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 text-white">
                {initials || '??'}
              </AvatarFallback>
            </Avatar>
            {previewUrl && (
              <button
                type="button"
                onClick={() => setPreviewUrl('')}
                className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md transition-colors"
                title="Remove photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {previewUrl ? 'Photo preview' : 'Initials fallback displayed when photo is not uploaded'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Image
            </TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Image URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 pt-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/30 rounded-xl p-6 text-center hover:border-primary/50 transition-colors bg-muted/20">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Click to select photo or drag and drop</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP up to 5MB</p>
              <Label htmlFor="photo-file-input" className="mt-4 cursor-pointer">
                <div className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                  Browse File
                </div>
                <Input
                  id="photo-file-input"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </Label>
              {selectedFile && (
                <span className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {selectedFile.name}
                </span>
              )}
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="image-url">Image Web URL</Label>
              <div className="flex gap-2">
                <Input
                  id="image-url"
                  placeholder="https://example.com/avatar.jpg"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                />
                <Button type="button" variant="secondary" onClick={handleApplyUrl}>
                  Apply
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex flex-row justify-between sm:justify-between items-center pt-4 border-t">
          {employee.avatarUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 gap-1.5"
              onClick={handleRemovePhoto}
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4" />
              Remove Photo
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isLoading}
              className="gap-1.5"
            >
              {isLoading ? 'Saving...' : 'Save Photo'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
