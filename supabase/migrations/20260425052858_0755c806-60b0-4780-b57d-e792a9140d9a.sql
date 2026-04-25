
DO $$
DECLARE
  v_results TEXT := E'\n=== GIG SPAM TRIGGER TEST RESULTS ===\n';
  v_test_user UUID := '00000000-0000-0000-0000-0000000000aa';
  v_inserted_id UUID;
BEGIN
  -- Test 1: BLOCK job listing
  BEGIN
    INSERT INTO public.jobs_services (user_id, title, description, price, category, status)
    VALUES (v_test_user, 'Hiring Personal Assistant', 'We are hiring a personal assistant for remote work. Apply now and send your CV today.', 1000, 'Other', 'active');
    v_results := v_results || E'TEST 1 (job listing) FAILED: NOT BLOCKED\n';
  EXCEPTION WHEN check_violation THEN
    v_results := v_results || E'TEST 1 (job listing) PASSED: blocked correctly\n';
  WHEN OTHERS THEN
    v_results := v_results || 'TEST 1 unexpected error: ' || SQLERRM || E'\n';
  END;

  -- Test 2: BLOCK promotional/referral spam
  BEGIN
    INSERT INTO public.jobs_services (user_id, title, description, price, category, status)
    VALUES (v_test_user, 'Download App And Signup', 'Download this app and sign up to earn $10 every hour. Use my referral code now.', 100, 'Other', 'active');
    v_results := v_results || E'TEST 2 (promo spam) FAILED: NOT BLOCKED\n';
  EXCEPTION WHEN check_violation THEN
    v_results := v_results || E'TEST 2 (promo spam) PASSED: blocked correctly\n';
  WHEN OTHERS THEN
    v_results := v_results || 'TEST 2 unexpected error: ' || SQLERRM || E'\n';
  END;

  -- Test 3: BLOCK whatsapp solicitation
  BEGIN
    INSERT INTO public.jobs_services (user_id, title, description, price, category, status)
    VALUES (v_test_user, 'Logo Design Service Pro', 'I will design your logo. WhatsApp me on 08012345678 to get started today.', 5000, 'Graphic Design', 'active');
    v_results := v_results || E'TEST 3 (whatsapp solicit) FAILED: NOT BLOCKED\n';
  EXCEPTION WHEN check_violation THEN
    v_results := v_results || E'TEST 3 (whatsapp solicit) PASSED: blocked correctly\n';
  WHEN OTHERS THEN
    v_results := v_results || 'TEST 3 unexpected error: ' || SQLERRM || E'\n';
  END;

  -- Test 4: PASS legitimate gig
  BEGIN
    INSERT INTO public.jobs_services (user_id, title, description, price, category, status)
    VALUES (v_test_user, 'Professional Logo Design', 'I will design a modern, unique logo for your brand with unlimited revisions and full ownership rights delivered in 48 hours.', 5000, 'Graphic Design', 'active')
    RETURNING id INTO v_inserted_id;
    v_results := v_results || 'TEST 4 (legit gig) PASSED: accepted, status=' ||
      (SELECT status FROM public.jobs_services WHERE id = v_inserted_id) || E'\n';
  EXCEPTION WHEN OTHERS THEN
    v_results := v_results || 'TEST 4 (legit gig) FAILED: ' || SQLERRM || E'\n';
  END;

  -- Test 5: FLAG short description (should accept but mark under_review)
  BEGIN
    INSERT INTO public.jobs_services (user_id, title, description, price, category, status)
    VALUES (v_test_user, 'Video Editing Service Pro', 'I edit videos fast.', 3000, 'Video Editing', 'active')
    RETURNING id INTO v_inserted_id;
    v_results := v_results || 'TEST 5 (short desc) result: status=' ||
      (SELECT status FROM public.jobs_services WHERE id = v_inserted_id) ||
      ', flag_logged=' ||
      (SELECT COUNT(*)::TEXT FROM public.gig_spam_flags WHERE gig_id = v_inserted_id) || E'\n';
  EXCEPTION WHEN OTHERS THEN
    v_results := v_results || 'TEST 5 (short desc) error: ' || SQLERRM || E'\n';
  END;

  -- Cleanup
  DELETE FROM public.jobs_services WHERE user_id = v_test_user;

  RAISE NOTICE '%', v_results;
END $$;
