
CREATE POLICY "auth read company-files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'company-files');
CREATE POLICY "auth insert company-files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-files');
CREATE POLICY "auth update company-files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'company-files');
CREATE POLICY "auth delete company-files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'company-files');
