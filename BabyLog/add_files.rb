#!/usr/bin/env ruby
require 'xcodeproj'

project_path = File.join(__dir__, 'BabyLog.xcodeproj')
project = Xcodeproj::Project.open(project_path)

# Get main target
main_target = project.targets.find { |t| t.name == 'BabyLog' }
abort("BabyLog target not found") unless main_target

# Helper: find or create a group from a path like "BabyLog/Shared"
def find_or_create_group(project, path)
  parts = path.split('/')
  group = project.main_group
  parts.each do |part|
    child = group.children.find { |c| c.is_a?(Xcodeproj::Project::Object::PBXGroup) && c.name == part }
    if child
      group = child
    else
      # Try display_name or path-based matching
      child = group.children.find { |c| c.is_a?(Xcodeproj::Project::Object::PBXGroup) && c.path == part }
      if child
        group = child
      else
        group = group.new_group(part, part)
      end
    end
  end
  group
end

# Helper: check if file is already in the group
def file_exists_in_group?(group, filename)
  group.children.any? { |c| c.is_a?(Xcodeproj::Project::Object::PBXFileReference) && c.path == filename }
end

# Files to add to main target
main_files = {
  'BabyLog/Shared' => [
    'SharedDefaults.swift',
    'IntentAPIClient.swift',
  ],
  'BabyLog/LiveActivity' => [
    'SleepActivityAttributes.swift',
    'SleepLiveActivityView.swift',
    'SleepActivityManager.swift',
  ],
  'BabyLog/Utils/AppIntents' => [
    'EndSleepLiveActivityIntent.swift',
    'QuickPumpingIntent.swift',
    'QuickBathIntent.swift',
    'QuickTummyTimeIntent.swift',
    'CheckBabyStatusIntent.swift',
  ],
  'BabyLog/Features/Dashboard' => [
    'SleepAdvisorCard.swift',
    'StatusHeroCard.swift',
    'QuickActionsRow.swift',
    'TodayAtAGlanceView.swift',
    'RecentActivityView.swift',
  ],
}

main_files.each do |group_path, files|
  group = find_or_create_group(project, group_path)
  files.each do |filename|
    next if file_exists_in_group?(group, filename)

    file_path = File.join(group_path, filename)
    ref = group.new_file(filename)
    main_target.source_build_phase.add_file_reference(ref)
    puts "Added #{file_path} to BabyLog target"
  end
end

# Save
project.save
puts "\nProject saved successfully!"
