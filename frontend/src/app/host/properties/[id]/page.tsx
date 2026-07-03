"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type HostProperty = {
  id: string;
  code: string;
  title: string;
  address: string;
  city: string;
  status: string;
  thumbnailUrl?: string | null;
};

type PhotoItem = {
  id: string;
  name: string;
  url: string;
  file: File;
  isMain: boolean;
};

function compressImageToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      const maxSide = 1400;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(imageUrl);
        reject(new Error("Cannot prepare image"));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(imageUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("Cannot load image"));
    };

    image.src = imageUrl;
  });
}

async function uploadPropertyImage(file: File, token: string) {
  const imageData = await compressImageToDataUrl(file);
  const response = await api.post<{ data: { url: string } }>(
    "/host/property-images",
    { imageData },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data.data.url;
}

export default function EditPropertyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const propertyId = params.id;
  const [property, setProperty] = useState<HostProperty | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.push(`/login?next=/host/properties/${propertyId}`);
      return;
    }

    api
      .get("/host/properties", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        const properties = (response.data.data ?? []) as HostProperty[];
        setProperty(properties.find((item) => item.id === propertyId) ?? null);
      })
      .catch((err) => setError(err.response?.data?.error?.message ?? "Không thể tải thông tin chỗ nghỉ."))
      .finally(() => setLoading(false));
  }, [propertyId, router]);

  function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    const validFiles = Array.from(files).filter((file) => {
      const isImage = ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type);
      return isImage && file.size <= 47 * 1024 * 1024;
    });

    const nextPhotos = validFiles.map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${index}-${crypto.randomUUID()}`,
      name: file.name,
      url: URL.createObjectURL(file),
      file,
      isMain: photos.length === 0 && index === 0,
    }));

    setPhotos((current) => [...current, ...nextPhotos]);
    setMessage("");
    setError("");
  }

  function removePhoto(id: string) {
    const removed = photos.find((photo) => photo.id === id);
    if (removed) URL.revokeObjectURL(removed.url);
    const nextPhotos = photos.filter((photo) => photo.id !== id);
    setPhotos(nextPhotos.some((photo) => photo.isMain) ? nextPhotos : nextPhotos.map((photo, index) => ({ ...photo, isMain: index === 0 })));
  }

  function makeMain(id: string) {
    setPhotos((current) => current.map((photo) => ({ ...photo, isMain: photo.id === id })));
  }

  async function saveImages(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) {
      router.push(`/login?next=/host/properties/${propertyId}`);
      return;
    }

    if (photos.length === 0) {
      setError("Vui lòng chọn ít nhất 1 ảnh thật của chỗ nghỉ.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const orderedPhotos = [
        ...photos.filter((photo) => photo.isMain),
        ...photos.filter((photo) => !photo.isMain),
      ];
      const imageUrls = await Promise.all(orderedPhotos.map((photo) => uploadPropertyImage(photo.file, token)));
      await api.patch(
        `/host/properties/${propertyId}/images`,
        { imageUrls },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage("Đã lưu ảnh thật cho chỗ nghỉ. Ảnh này sẽ hiển thị trên trang public sau khi tải lại.");
      setProperty((current) => current ? { ...current, thumbnailUrl: imageUrls[0] } : current);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(message ?? "Không thể lưu ảnh. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Host</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Cập nhật ảnh chỗ nghỉ</h1>
        {property ? <p className="mt-2 text-sm text-slate-600">{property.title} · {property.address}</p> : null}
      </div>

      {loading ? <p className="text-sm text-slate-500">Đang tải chỗ nghỉ...</p> : null}
      {!loading && !property ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Không tìm thấy chỗ nghỉ hoặc bạn không có quyền chỉnh sửa.
        </div>
      ) : null}

      {property ? (
        <form onSubmit={saveImages} className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-teal-950/5">
            <label className="grid min-h-[150px] cursor-pointer place-items-center rounded-md border border-dashed border-slate-400 bg-slate-50 px-4 py-8 text-center transition hover:border-teal-600 hover:bg-teal-50">
              <span className="font-semibold text-slate-950">Chọn ảnh thật của chỗ nghỉ</span>
              <span className="mt-2 text-sm text-slate-600">jpg, png hoặc webp, tối đa 47MB mỗi file</span>
              <span className="mt-4 rounded-md border border-teal-700 bg-white px-4 py-2 text-sm font-semibold text-teal-700">Tải ảnh lên</span>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(event) => {
                  addPhotos(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>

            {photos.length ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {photos.map((photo) => (
                  <div key={photo.id} className={`relative aspect-[4/3] overflow-hidden rounded-md border-2 bg-slate-100 ${photo.isMain ? "border-amber-500" : "border-slate-200"}`}>
                    {photo.isMain ? <span className="absolute left-2 top-0 z-10 rounded-b bg-amber-500 px-2 py-1 text-xs font-semibold text-white">Ảnh chính</span> : null}
                    <button type="button" onClick={() => makeMain(photo.id)} className="relative block h-full w-full" aria-label={`Đặt ${photo.name} làm ảnh chính`}>
                      <Image src={photo.url} alt={photo.name} fill unoptimized sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
                    </button>
                    <button type="button" onClick={() => removePhoto(photo.id)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white text-lg font-semibold text-slate-700 shadow-md transition hover:bg-rose-50 hover:text-rose-600" aria-label={`Xóa ${photo.name}`}>×</button>
                  </div>
                ))}
              </div>
            ) : null}

            {error ? <p className="mt-5 rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
            {message ? <p className="mt-5 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="submit" disabled={saving}>{saving ? "Đang lưu ảnh..." : "Lưu ảnh thật"}</Button>
              <a href="/host/properties" className="rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50">Quay lại danh sách</a>
            </div>
          </section>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-teal-950/5">
            <p className="text-sm font-semibold text-slate-950">Ảnh đang hiển thị</p>
            <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-md bg-slate-100">
              {property.thumbnailUrl ? (
                <Image src={property.thumbnailUrl} alt={property.title} fill unoptimized sizes="320px" className="object-cover" />
              ) : (
                <div className="grid h-full place-items-center px-4 text-center text-sm text-slate-500">Chưa có ảnh thật</div>
              )}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Ảnh chính là ảnh đầu tiên khách thấy ở trang tìm kiếm và trang chi tiết. Hãy chọn ảnh thật, rõ sáng, đúng với chỗ nghỉ.
            </p>
          </aside>
        </form>
      ) : null}
    </main>
  );
}
