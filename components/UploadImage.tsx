'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function UploadImage() {
  const [file, setFile] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const uploadFile = async () => {
    setError(null);
    setImgUrl(null);
    setUploadProgress(0);

    // Basic validation
    if (!file) {
      setError('กรุณาเลือกไฟล์รูปภาพก่อน');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('รองรับเฉพาะไฟล์รูปภาพเท่านั้น');
      return;
    }
    // Optional: 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setError('ไฟล์ใหญ่เกิน 5MB');
      return;
    }

    const fileName = `${Date.now()}-${file.name}`;
    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      const supabase = createClient();
      setUploadProgress(30);
      
      const { data, error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined,
        });

      setUploadProgress(70);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        
        // Handle specific RLS error
        if (uploadError.message.includes('row-level security')) {
          setError('ไม่มีสิทธิ์ในการอัปโหลด กรุณาตรวจสอบการตั้งค่า Supabase Storage Policy');
        } else if (uploadError.message.includes('bucket')) {
          setError('ไม่พบ Storage Bucket "images" กรุณาสร้าง bucket ใน Supabase Dashboard');
        } else {
          setError(`อัปโหลดไม่สำเร็จ: ${uploadError.message}`);
        }
        return;
      }

      if (!data || !data.path) {
        setError('ไม่สามารถได้รับข้อมูลไฟล์ที่อัปโหลด');
        return;
      }

      setUploadProgress(90);

      const { data: publicUrlData } = supabase.storage
        .from("images")
        .getPublicUrl(data.path);

      if (!publicUrlData.publicUrl) {
        setError('ไม่สามารถสร้าง URL สำหรับไฟล์ที่อัปโหลด');
        return;
      }

      setImgUrl(publicUrlData.publicUrl);
      setUploadProgress(100);
      console.log('Upload successful:', publicUrlData.publicUrl);
    } catch (e: any) {
      console.error('Unexpected upload error:', e);
      setError(`เกิดข้อผิดพลาด: ${e?.message || 'ไม่ทราบสาเหตุ'}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  return (
    <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg w-96 bg-white shadow-sm">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">อัปโหลดรูปภาพ</h3>
        
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError(null);
            setImgUrl(null);
          }}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-4"
        />
        
        {file && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">ไฟล์ที่เลือก:</span> {file.name}
            </p>
            <p className="text-xs text-gray-500">
              ขนาด: {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}
        
        <button
          onClick={uploadFile}
          disabled={!file || isUploading}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
            !file || isUploading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
          }`}
        >
          {isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปภาพ'}
        </button>

        {isUploading && uploadProgress > 0 && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 mt-1">{uploadProgress}%</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
            {error.includes('row-level security') && (
              <div className="mt-2 text-xs text-red-500">
                <p><strong>วิธีแก้ไข:</strong></p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>เข้าไปที่ Supabase Dashboard</li>
                  <li>ไปที่ Storage → กด bucket "images"</li>
                  <li>ตั้งค่าให้เป็น Public bucket</li>
                  <li>หรือสร้าง Storage Policy ที่อนุญาตการอัปโหลด</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {imgUrl && (
          <div className="mt-6">
            <p className="text-sm font-medium text-green-600 mb-3">✅ อัปโหลดสำเร็จ!</p>
            <div className="border rounded-lg overflow-hidden">
              <img 
                src={imgUrl} 
                alt="Uploaded" 
                className="w-full h-48 object-cover"
                onLoad={() => console.log('Image loaded successfully')}
                onError={() => setError('ไม่สามารถโหลดรูปภาพได้')}
              />
            </div>
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 break-all">
              URL: {imgUrl}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
