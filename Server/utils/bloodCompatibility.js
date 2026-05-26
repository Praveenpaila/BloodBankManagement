const donorGroupsByRecipient = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
};

const compatibleDonorGroupsFor = (recipientBloodGroup) =>
  donorGroupsByRecipient[recipientBloodGroup] || [];

const bloodGroupFilterFor = (recipientBloodGroup) => {
  const groups = compatibleDonorGroupsFor(recipientBloodGroup);
  if (groups.length === 0) return recipientBloodGroup;
  return { $in: groups };
};

module.exports = {
  compatibleDonorGroupsFor,
  bloodGroupFilterFor,
};
