from django.contrib import admin

from .models import JobApplication


@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    list_display = ['position', 'company', 'status', 'owner', 'applied_date', 'updated_at']
    list_filter = ['status']
    search_fields = ['company', 'position', 'owner__username']
