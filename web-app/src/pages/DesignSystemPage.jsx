import { useState } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Icon,
  Input,
  Spinner,
  Typography,
  Badge,
  Textarea,
  Checkbox,
  Switch,
  Radio,
  Avatar,
  Divider,
  Progress,
  Skeleton,
  Tooltip,
  Breadcrumb,
  Pagination,
} from '@/components/ui';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarItem,
  SidebarSection,
  Navbar,
  NavbarItem,
  NavbarSection,
  PageHeader,
  
} from '@/components/layout';

function Section({ title, children }) {
  return (
    <section className="space-y-6">
      <Typography as="h2" variant="h2" weight="semibold">
        {title}
      </Typography>

      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [checkbox, setCheckbox] = useState(true);
  const [switchEnabled, setSwitchEnabled] = useState(true);
  const [selectedRole, setSelectedRole] = useState("student");
  const [page, setPage] = useState(4);

  return (
    <main className="min-h-screen bg-[var(--color-bg)] p-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-16">
        <Typography as="h1" variant="display" weight="bold">
          Design System
        </Typography>

        {/* -------------------------------- */}
        {/* Typography */}
        {/* -------------------------------- */}

        <Section title="Typography">
          <div className="space-y-4">
            <Typography variant="display">Display</Typography>

            <Typography variant="h1">Heading 1</Typography>

            <Typography variant="h2">Heading 2</Typography>

            <Typography variant="h3">Heading 3</Typography>

            <Typography variant="title">Title</Typography>

            <Typography variant="body">
              This is the default body text.
            </Typography>

            <Typography variant="body-small" color="muted">
              Smaller body text.
            </Typography>

            <Typography variant="caption" color="muted">
              Caption text
            </Typography>

            <Typography variant="mono">const app = "Design System";</Typography>
          </div>
        </Section>

        {/* -------------------------------- */}
        {/* Buttons */}
        {/* -------------------------------- */}

        <Section title="Buttons">
          <div className="flex flex-wrap gap-4">
            <Button>Primary</Button>

            <Button variant="secondary">Secondary</Button>

            <Button variant="outline">Outline</Button>

            <Button variant="ghost">Ghost</Button>

            <Button variant="danger">Delete</Button>

            <Button leftIcon="upload">Upload</Button>

            <Button rightIcon="chevron-right">Continue</Button>

            <Button loading>Saving...</Button>
          </div>
        </Section>

        {/* -------------------------------- */}
        {/* Icons */}
        {/* -------------------------------- */}

        <Section title="Icons">
          <div className="flex flex-wrap gap-6">
            <Icon name="folder" size="xl" />

            <Icon name="folder-open" size="xl" />

            <Icon name="upload" size="xl" color="primary" />

            <Icon name="trash" size="xl" color="danger" />

            <Icon name="check" size="xl" color="success" />

            <Icon name="sparkles" size="xl" />

            <Icon name="message-circle" size="xl" />

            <Icon name="users" size="xl" />
          </div>
        </Section>

        {/* -------------------------------- */}
        {/* Spinner */}
        {/* -------------------------------- */}

        <Section title="Spinner">
          <div className="flex items-center gap-6">
            <Spinner size="sm" />

            <Spinner size="md" />

            <Spinner size="lg" />

            <Spinner size="xl" color="primary" />
          </div>
        </Section>

        {/* -------------------------------- */}
        {/* Card */}
        {/* -------------------------------- */}

        <Section title="Card">
          <Card className="max-w-lg">
            <CardHeader>
              <Typography variant="title" weight="semibold">
                Documents
              </Typography>
            </CardHeader>

            <CardContent>
              <Typography color="muted">
                Upload PDF, DOCX, PPTX or Markdown files to build your
                workspace.
              </Typography>
            </CardContent>

            <CardFooter>
              <Button leftIcon="upload">Upload</Button>
            </CardFooter>
          </Card>
        </Section>

        <Section title="Inputs">
          <div className="flex max-w-xl flex-col gap-6">
            <Input
              label="Workspace Name"
              placeholder="Enter workspace name"
              required
            />

            <Input
              label="Search"
              placeholder="Search documents..."
              leftIcon="search"
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              rightIcon={showPassword ? 'eyeOff' : 'eye'}
              onRightIconClick={() => setShowPassword((prev) => !prev)}
            />

            <Input
              label="Workspace Name"
              helperText="Maximum 50 characters"
              placeholder="AI Learning Workspace"
            />

            <Input
              label="Workspace Name"
              error="Workspace name is required"
              placeholder="Enter workspace name"
            />

            <Input label="Disabled" placeholder="Disabled input" disabled />

            <Input
              label="Large Input"
              size="lg"
              placeholder="Large input example"
            />

            <Input
              label="Filled Variant"
              variant="filled"
              placeholder="Filled input"
            />

            <Input
              label="Ghost Variant"
              variant="ghost"
              placeholder="Ghost input"
            />
          </div>
        </Section>

        <Section title="Badges">
          <div className="flex flex-wrap gap-4">
            <Badge>Default</Badge>

            <Badge variant="primary">Primary</Badge>

            <Badge variant="success">Completed</Badge>

            <Badge variant="warning">Processing</Badge>

            <Badge variant="danger">Failed</Badge>

            <Badge variant="info">AI</Badge>

            <Badge variant="neutral">Student</Badge>

            <Badge variant="primary" rounded>
              Rounded
            </Badge>
          </div>
        </Section>

        <Section title="Textarea">
  <div className="flex max-w-2xl flex-col gap-6">
    <Textarea
      label="Workspace Description"
      placeholder="Describe your workspace..."
    />

    <Textarea
      label="AI Prompt"
      helperText="Markdown is supported."
      placeholder="Write your prompt..."
      rows={8}
    />

    <Textarea
      label="Error State"
      error="Description is required."
      placeholder="Enter a description..."
    />

    <Textarea
      label="Filled Variant"
      variant="filled"
      placeholder="Filled textarea..."
    />

    <Textarea
      label="No Resize"
      resize="none"
      placeholder="Resize disabled..."
    />
  </div>
</Section>
<Section title="Checkbox">
  <div className="flex max-w-xl flex-col gap-6">
    <Checkbox
      checked={checkbox}
      onCheckedChange={setCheckbox}
      label="Accept Terms & Conditions"
    />

    <Checkbox
      label="Enable AI Suggestions"
      helperText="Recommended for faster learning."
    />

    <Checkbox
      label="Required Option"
      required
      error="This option must be selected."
    />

    <Checkbox
      label="Disabled"
      disabled
      checked
      readOnly
    />

    <Checkbox
      label="Large Checkbox"
      size="lg"
      checked
      readOnly
    />
  </div>
</Section>
<Section title="Switch">
  <div className="flex max-w-xl flex-col gap-6">
    <Switch
      checked={switchEnabled}
      onCheckedChange={setSwitchEnabled}
      label="Enable AI Suggestions"
    />

    <Switch
      label="Workspace Notifications"
      helperText="Receive email notifications."
    />

    <Switch
      label="Required Option"
      required
      error="This setting is required."
    />

    <Switch
      label="Disabled"
      checked
      disabled
      readOnly
    />

    <Switch
      label="Large Switch"
      checked
      size="lg"
      readOnly
    />
  </div>
</Section>
<Section title="Radio">
  <div className="flex max-w-xl flex-col gap-6">
    <Radio
      name="role"
      value="student"
      checked={selectedRole === "student"}
      onChange={() => setSelectedRole("student")}
      label="Student"
      helperText="Standard learning access."
    />

    <Radio
      name="role"
      value="admin"
      checked={selectedRole === "admin"}
      onChange={() => setSelectedRole("admin")}
      label="Administrator"
      helperText="Full platform access."
    />

    <Radio
      name="required"
      value="required"
      label="Required Option"
      required
      error="Please select an option."
    />

    <Radio
      name="disabled"
      value="disabled"
      checked
      disabled
      readOnly
      label="Disabled"
    />

    <Radio
      name="large"
      value="large"
      checked
      readOnly
      size="lg"
      label="Large Radio"
    />
  </div>
</Section>
<Section title="Avatar">
  <div className="flex flex-wrap items-center gap-6">
    <Avatar />

    <Avatar initials="MU" />

    <Avatar initials="AI" size="lg" />

    <Avatar initials="JD" status="online" />

    <Avatar initials="MK" status="away" />

    <Avatar initials="AD" status="busy" />

    <Avatar initials="OF" status="offline" />

    <Avatar
      initials="SQ"
      shape="square"
      size="lg"
    />
  </div>
</Section>
<Section title="Divider">
  <div className="flex flex-col gap-8">
    <Divider />

    <Divider label="OR" />

    <Divider
      label="Workspace"
      align="left"
    />

    <Divider
      label="Settings"
      align="right"
    />

    <div className="flex h-24 items-center gap-6">
      <Typography>Left</Typography>

      <Divider orientation="vertical" />

      <Typography>Right</Typography>
    </div>
  </div>
</Section>
<Section title="Progress">
  <div className="flex max-w-xl flex-col gap-8">
    <Progress
      value={25}
      label="Document Upload"
      showValue
    />

    <Progress
      value={60}
      label="Workspace Processing"
      showValue
      color="info"
    />

    <Progress
      value={82}
      label="Course Progress"
      showValue
      color="success"
    />

    <Progress
      value={40}
      label="Large Progress"
      size="lg"
    />

    <Progress
      label="Generating AI Summary"
      indeterminate
    />
  </div>
</Section>
<Section title="Skeleton">
  <div className="flex max-w-2xl flex-col gap-8">
    <Skeleton />

    <Skeleton height={24} width="60%" />

    <Skeleton height={48} />

    <div className="flex items-center gap-4">
      <Skeleton
        shape="circle"
        width={48}
        height={48}
      />

      <div className="flex flex-1 flex-col gap-2">
        <Skeleton width="40%" />

        <Skeleton />
      </div>
    </div>

    <Card>
      <CardHeader>
        <Skeleton
          width="50%"
          height={24}
        />
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          <Skeleton />

          <Skeleton width="85%" />

          <Skeleton width="70%" />
        </div>
      </CardContent>
    </Card>

    <Skeleton
      animation="pulse"
      height={40}
    />
  </div>
</Section>
<Section title="Tooltip">
  <div className="flex flex-wrap items-center gap-6">
    <Tooltip content="Upload documents">
      <Button variant="secondary">
        Upload
      </Button>
    </Tooltip>

    <Tooltip content="Delete workspace">
      <Button variant="danger">
        Delete
      </Button>
    </Tooltip>

    <Tooltip
      content="Workspace settings"
      side="right"
    >
      <Button variant="ghost">
        <Icon name="settings" />
      </Button>
    </Tooltip>

    <Tooltip
      content="User profile"
      side="bottom"
    >
      <Avatar initials="MU" />
    </Tooltip>
  </div>
</Section>
<Section title="Breadcrumb">
  <div className="space-y-6">
    <Breadcrumb
      items={[
        {
          label: "Home",
          href: "/",
        },
        {
          label: "Courses",
          href: "/courses",
        },
        {
          label: "React Fundamentals",
        },
      ]}
    />

    <Breadcrumb
      items={[
        {
          label: "Workspace",
          icon: "folder",
          href: "/",
        },
        {
          label: "AI Notes",
        },
      ]}
    />

    <Breadcrumb
      items={[
        {
          label: "Dashboard",
          icon: "home",
          href: "/",
        },
        {
          label: "Settings",
          icon: "settings",
          href: "/settings",
        },
        {
          label: "Appearance",
        },
      ]}
    />
  </div>
</Section>
<Section title="Pagination">
  <div className="max-w-3xl space-y-8">
    <Pagination
      page={page}
      totalPages={18}
      onPageChange={setPage}
    />

    <Pagination
      page={page}
      totalPages={24}
      totalItems={472}
      pageSize={20}
      onPageChange={setPage}
    />
  </div>
</Section>
<Sidebar collapsed={false}>
  <SidebarHeader>
    Workspace
  </SidebarHeader>

  <SidebarContent>
    <SidebarSection title="Workspace">
      <SidebarItem
        icon="folder"
        label="Overview"
        active
      />

      <SidebarItem
        icon="upload"
        label="Documents"
      />

      <SidebarItem
        icon="messageCircle"
        label="AI Chat"
        badge="3"
      />
    </SidebarSection>

    <SidebarSection title="Administration">
      <SidebarItem
        icon="users"
        label="Members"
      />

      <SidebarItem
        icon="settings"
        label="Settings"
      />
    </SidebarSection>
  </SidebarContent>

  <SidebarFooter>
    Footer
  </SidebarFooter>
</Sidebar>
<Navbar>
  <NavbarSection align="left">
    <NavbarItem>
      <Typography
        variant="title"
        weight="bold"
      >
        Capstone
      </Typography>
    </NavbarItem>

    <NavbarItem>
      <Breadcrumb
        items={[
          {
            label: "Workspace",
          },
          {
            label: "AI Notes",
          },
        ]}
      />
    </NavbarItem>
  </NavbarSection>

  <NavbarSection align="center">
    <Input
      placeholder="Search..."
      leftIcon="search"
      className="w-80"
    />
  </NavbarSection>

  <NavbarSection align="right">
    <NavbarItem>
      <Button
        variant="ghost"
        size="sm"
      >
        <Icon name="bell" />
      </Button>
    </NavbarItem>

    <NavbarItem>
      <Avatar initials="MU" />
    </NavbarItem>
  </NavbarSection>
</Navbar>
<PageHeader
  title="Members"
  description="Manage workspace members."
>
  <Button
    leftIcon="userPlus"
  >
    Invite Member
  </Button>
</PageHeader>
      </div>
    </main>
  );
}
