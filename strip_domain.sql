UPDATE "User" SET username = SPLIT_PART(username, '@', 1);
