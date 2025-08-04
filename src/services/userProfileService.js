import { getSupabaseClient } from '../supabaseClient';

export class UserProfileService {
  constructor() {
    this.supabase = null;
  }

  // Get the current Supabase client
  getSupabase() {
    if (!this.supabase) {
      this.supabase = getSupabaseClient();
    }
    return this.supabase;
  }

  // Get current user's profile
  async getUserProfile() {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available', profile: null };
      }

      const { data, error } = await supabase.rpc('get_user_profile');
      
      if (error) throw error;
      return { success: true, profile: data && data.length > 0 ? data[0] : null };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return { success: false, error: error.message, profile: null };
    }
  }

  // Update user profile
  async updateUserProfile(firstName, lastName, displayName, avatarUrl) {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available' };
      }

      const { data, error } = await supabase.rpc('upsert_user_profile', {
        p_first_name: firstName,
        p_last_name: lastName,
        p_display_name: displayName,
        p_avatar_url: avatarUrl
      });

      if (error) throw error;
      return { success: true, id: data };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user display name (first name + last name or email fallback)
  async getUserDisplayName() {
    try {
      const result = await this.getUserProfile();
      if (result.success && result.profile) {
        const { first_name, last_name, display_name } = result.profile;
        
        if (display_name) {
          return display_name;
        } else if (first_name && last_name) {
          return `${first_name} ${last_name}`;
        } else if (first_name) {
          return first_name;
        } else if (last_name) {
          return last_name;
        }
      }
      
      // Fallback to email
      const supabase = this.getSupabase();
      if (!supabase) return 'User';
      
      const { data: { user } } = await supabase.auth.getUser();
      return user?.email || 'User';
    } catch (error) {
      console.error('Error getting user display name:', error);
      return 'User';
    }
  }

  // Get user initials for avatar
  async getUserInitials() {
    try {
      const result = await this.getUserProfile();
      if (result.success && result.profile) {
        const { first_name, last_name } = result.profile;
        
        if (first_name && last_name) {
          return `${first_name.charAt(0)}${last_name.charAt(0)}`.toUpperCase();
        } else if (first_name) {
          return first_name.charAt(0).toUpperCase();
        } else if (last_name) {
          return last_name.charAt(0).toUpperCase();
        }
      }
      
      // Fallback to email first letter
      const supabase = this.getSupabase();
      if (!supabase) return 'U';
      
      const { data: { user } } = await supabase.auth.getUser();
      return user?.email?.charAt(0).toUpperCase() || 'U';
    } catch (error) {
      console.error('Error getting user initials:', error);
      return 'U';
    }
  }

  // Get complete user info (profile + auth data)
  async getCompleteUserInfo() {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available' };
      }

      const [profileResult, authResult] = await Promise.all([
        this.getUserProfile(),
        supabase.auth.getUser()
      ]);

      const profile = profileResult.success ? profileResult.profile : null;
      const user = authResult.data?.user;

      return {
        success: true,
        user: {
          id: user?.id,
          email: user?.email,
          firstName: profile?.first_name,
          lastName: profile?.last_name,
          displayName: profile?.display_name,
          avatarUrl: profile?.avatar_url,
          initials: await this.getUserInitials(),
          fullName: profile?.first_name && profile?.last_name 
            ? `${profile.first_name} ${profile.last_name}` 
            : profile?.first_name || profile?.last_name || user?.email || 'User'
        }
      };
    } catch (error) {
      console.error('Error getting complete user info:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create a singleton instance
export const userProfileService = new UserProfileService(); 