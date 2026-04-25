
CREATE TABLE IF NOT EXISTS public._gig_spam_test_results (test TEXT, result TEXT);
TRUNCATE public._gig_spam_test_results;

DO $$
DECLARE
  v_test_user UUID := '00000000-0000-0000-0000-0000000000aa';
  v_inserted_id UUID;
  v_status TEXT;
  v_flag_count INT;
BEGIN
  BEGIN
    INSERT INTO public.jobs_services (user_id, title, description, price, category, status)
    VALUES (v_test_user, 'Hiring Personal Assistant', 'We are hiring a personal assistant for remote work. Apply now and send your CV today.', 1000, 'Other', 'active');
    INSERT INTO public._gig_spam_test_results VALUES ('TEST 1 job listing', 'FAIL - not blocked');
  EXCEPTION WHEN check_violation THEN
    INSERT INTO public._gig_spam_test_results VALUES ('TEST 1 job listing', 'PASS - blocked');
  WHEN OTHERS THEN
    INSERT INTO public._gig_spam_test_results VALUES ('TEST 1 job listing', 'ERR ' || SQLERRM);
  END;

  BEGIN
    INSERT INTO public.jobs_services (user_id, title, description, price, category, status)
    VALUES (v_test_user, 'Download App And Signup', 'Download this app and sign up to earn $10 every hour. Use my referral code now.', 100, 'Other', 'active');
    INSERT INTO public._gig_spam_test_results VALUES ('TEST 2 promo spam', 'FAIL - not blocked');
  EXCEPTION WHEN check_violation THEN
    INSERT INTO public._gig_spam_test_results VALUES ('TEST 2 promo spam', 'PASS - blocked');
  WHEN OTHERS THEN
    INSERT INTO public._gig_spam_test_results VALUES ('TEST 2 promo spam', 'ERR ' || SQLERRM);
  END;

  BEGIN
    INSERT INTO public.jobs_services (user_id, title, description, price, category, status)
    VALUES (v_test_user, 'Logo Design Service Pro', 'I will design your logo. WhatsApp me on 08012345678 to get started today.', 5000, 'Graphic Design', 'active');
    INSERT INTO public._gig_spam_test_results VALUES ('TEST 3 whatsapp solicit', 'FAIL - not blocked');
  EXCEPTION WHEN check_violation THEN
    INSERT INTO public._gig_spam_test_results VALUES ('TEST 3 whatsapp solicit', 'PASS - blocked');
  WHEN OTHERS THEN
    INSERT INTO public._gig_spam_test_results VALUES ('TEST 3 whatsapp solicit', 'ERR ' || SQLERRM);
  END;

  BEGIN
    INSERT INTO public.jobs_services (user_id, title, description, price, category, status)
    VALUES (v_test_user, 'Professional Logo Design', 'I will design a modern, unique logo for your brand with unlimited revisions and full ownership rights delivered in 48 hours.', 5000, 'Graphic Design', 'active')
    RETURNING id INTO v_inserted_id;
    SELECT status INTO v_status FROM public.jobs_services WHERE id = v_inserted_id;
    INSERT INTO public._gig_spam_test_results VALUES ('TEST 4 legit gig', 'PASS - accepted, status=' || v_status);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public._gig_spam_test_results VALUES ('TEST 4 legit gig', 'FAIL ' || SQLERRM);
  END;

  BEGIN
    INSERT INTO public.jobs_services (user_id, title, description, price, category, status)
    VALUES (v_test_user, 'Video Editing Service Pro', 'I edit videos fast.', 3000, 'Video Editing', 'active')
    RETURNING id INTO v_inserted_id;
    SELECT status INTO v_status FROM public.jobs_services WHERE id = v_inserted_id;
    SELECT COUNT(*) INTO v_flag_count FROM public.gig_spam_flags WHERE gig_id = v_inserted_id;
    INSERT INTO public._gig_spam_test_results VALUES ('TEST 5 short desc', 'status=' || v_status || ' flags=' || v_flag_count);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public._gig_spam_test_results VALUES ('TEST 5 short desc', 'ERR ' || SQLERRM);
  END;

  DELETE FROM public.jobs_services WHERE user_id = v_test_user;
END $$;
